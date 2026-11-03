import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_SALONS, DEFAULT_SALON_SERVICES } from '../data/initialSalons';
import {
  formatTokenNumber,
  getSalonQueueMetrics,
  getCustomerTokenProgress,
  bookNewTokenForSalon,
  callNextTokenInSalon,
  skipCurrentOrNextToken,
  cancelTokenById,
  filterAndSortSalons,
  buildCustomerWhatsAppTicketUrl,
  buildAdminWhatsAppAlertUrl,
} from './queueLogic';

test('initial 5 Jaunpur salons match exact prompt token numbers and wait times', () => {
  const [thanker, royal, urban, aura, classic] = INITIAL_SALONS;

  const m1 = getSalonQueueMetrics(thanker);
  assert.equal(m1.nowServingFormatted, '#05');
  assert.equal(m1.waitingCount, 3);
  assert.equal(m1.estimatedWaitLabel, '~20 mins');
  assert.equal(m1.nextAvailableFormatted, '#09');
  assert.equal(m1.nowServingCustomer?.customerName, 'Rahul Verma');

  const m2 = getSalonQueueMetrics(royal);
  assert.equal(m2.nowServingFormatted, '#03');
  assert.equal(m2.waitingCount, 2);
  assert.equal(m2.estimatedWaitLabel, '~15 mins');
  assert.equal(m2.nextAvailableFormatted, '#06');

  const m3 = getSalonQueueMetrics(urban);
  assert.equal(m3.nowServingFormatted, '#08');
  assert.equal(m3.waitingCount, 4);
  assert.equal(m3.estimatedWaitLabel, '~30 mins');
  assert.equal(m3.nextAvailableFormatted, '#13');

  const m4 = getSalonQueueMetrics(aura);
  assert.equal(m4.nowServingFormatted, '#02');
  assert.equal(m4.waitingCount, 1);
  assert.equal(m4.estimatedWaitLabel, '~10 mins');
  assert.equal(m4.nextAvailableFormatted, '#04');

  const m5 = getSalonQueueMetrics(classic);
  assert.equal(m5.nowServingFormatted, '#06');
  assert.equal(m5.waitingCount, 0);
  assert.equal(m5.waitingLabel, '0 People (No Wait!)');
  assert.equal(m5.estimatedWaitLabel, '0 mins');
  assert.equal(m5.nextAvailableFormatted, '#07');
});

test('booking a new token assigns #09 on Thanker Flagship and tracks 3 people ahead', () => {
  const thanker = INITIAL_SALONS[0];
  const { updatedSalon, bookedToken } = bookNewTokenForSalon(thanker, {
    customerName: 'Shriyansh Singh',
    customerPhone: '9876543210',
    services: [DEFAULT_SALON_SERVICES[0], DEFAULT_SALON_SERVICES[1]],
    bookingType: 'Join Live Queue Now',
  });

  assert.equal(formatTokenNumber(bookedToken.tokenNumber), '#09');
  assert.equal(bookedToken.totalAmount, 228);

  const metricsAfter = getSalonQueueMetrics(updatedSalon);
  assert.equal(metricsAfter.waitingCount, 4);
  assert.equal(metricsAfter.nextAvailableFormatted, '#10');

  const progress = getCustomerTokenProgress(updatedSalon, bookedToken);
  assert.equal(progress.currentlyServingFormatted, '#05');
  assert.equal(progress.peopleAheadCount, 3);
  assert.equal(progress.estimatedTurnLabel, '~20 Mins');
});

test('calling next token in Admin advances #05 -> #06 and updates customer progress', () => {
  const thanker = INITIAL_SALONS[0];
  const { updatedSalon, bookedToken } = bookNewTokenForSalon(thanker, {
    customerName: 'Shriyansh Singh',
    customerPhone: '9876543210',
    services: [DEFAULT_SALON_SERVICES[0]],
    bookingType: 'Join Live Queue Now',
  });

  const afterCallNext = callNextTokenInSalon(updatedSalon);
  const metrics = getSalonQueueMetrics(afterCallNext);
  assert.equal(metrics.nowServingFormatted, '#06');
  assert.equal(metrics.waitingCount, 3); // #07, #08, #09 waiting

  const progress = getCustomerTokenProgress(afterCallNext, bookedToken);
  assert.equal(progress.currentlyServingFormatted, '#06');
  assert.equal(progress.peopleAheadCount, 2); // #07 and #08 ahead of #09
});

test('skipping current token and cancelling customer token updates queue accurately', () => {
  const thanker = INITIAL_SALONS[0];
  const afterSkip = skipCurrentOrNextToken(thanker);
  const metrics = getSalonQueueMetrics(afterSkip);
  assert.equal(metrics.nowServingFormatted, '#06');
  assert.equal(metrics.waitingCount, 2); // #07 and #08 left waiting

  const token7 = afterSkip.queue.find((t) => t.tokenNumber === 7)!;
  const afterCancel = cancelTokenById(afterSkip, token7.id);
  const metricsAfterCancel = getSalonQueueMetrics(afterCancel);
  assert.equal(metricsAfterCancel.waitingCount, 1); // only #08 left waiting
});

test('filtering by Jaunpur area, service query, and Shortest Wait Time works', () => {
  const civilLines = filterAndSortSalons(INITIAL_SALONS, {
    searchQuery: '',
    selectedArea: 'Civil Lines',
  });
  assert.equal(civilLines.length, 1);
  assert.equal(civilLines[0].id, 'salon-royal-glow');

  const shortest = filterAndSortSalons(INITIAL_SALONS, {
    searchQuery: '',
    selectedArea: 'Shortest Wait Time',
  });
  assert.equal(shortest[0].id, 'salon-classic-barber'); // 0 mins wait first!

  const byService = filterAndSortSalons(INITIAL_SALONS, {
    searchQuery: 'Bridal Makeup',
    selectedArea: 'All Jaunpur',
  });
  assert.equal(byService.length, 5);
});

test('WhatsApp URL builders target +917043602377 and format messages properly', () => {
  const thanker = INITIAL_SALONS[0];
  const { updatedSalon, bookedToken } = bookNewTokenForSalon(thanker, {
    customerName: 'Aarav',
    customerPhone: '9123456789',
    services: [DEFAULT_SALON_SERVICES[0]],
    bookingType: 'Join Live Queue Now',
  });
  const tracker = getCustomerTokenProgress(updatedSalon, bookedToken);
  const customerUrl = buildCustomerWhatsAppTicketUrl(bookedToken, tracker);
  assert.ok(customerUrl.startsWith('https://wa.me/917043602377?text='));
  assert.ok(decodeURIComponent(customerUrl).includes('#09'));

  const adminAlertUrl = buildAdminWhatsAppAlertUrl(bookedToken, thanker.name);
  assert.ok(adminAlertUrl.startsWith('https://wa.me/919123456789?text='));
  assert.ok(decodeURIComponent(adminAlertUrl).includes('please arrive in 5 mins!'));
});
