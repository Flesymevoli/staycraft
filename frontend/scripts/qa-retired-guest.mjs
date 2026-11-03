import assert from 'node:assert/strict';
import {retiredGuestPath} from '../src/lib/retired-guest.ts';
for(const path of ['/guest','/guest/book','/guest/orders','/guest/contact','/api/guest','/api/guest/photo','/api/workspace/automation','/app/messages/123'])assert.equal(retiredGuestPath(path),true,path);
for(const path of ['/app','/app/work','/app/bookings/history','/api/workspace/bookings','/api/workspace/inventory','/api/workspace/assistant','/api/guesthouse','/guesthouse'])assert.equal(retiredGuestPath(path),false,path);
console.log('Retired guest route boundaries and retained owner paths passed. Database migration not applied by this test.');
