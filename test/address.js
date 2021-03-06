/*global require, describe, before, after, it*/
'use strict';

var mockery = require('mockery'),
    should = require('should'),
    Download = null;

describe('downloadTests', function () {
    before(function () {
        mockery.enable();
        mockery.enable({
            useCleanCache: true
        });
        mockery.warnOnUnregistered(false);
        mockery.warnOnReplace(false);
        mockery.registerSubstitute('ftp', '../test/mock/ftp.js');
        Download = require('../src/utils/address.js');
    });

    after(function () {
        mockery.deregisterAll();
        mockery.disable();
    });

    it('should return proper ftp address', function (done) {
        Download.getDatabaseAddresses()
            .then(function (addresses) {
                addresses[0].should.be.exactly('ftp://rozklady.ztm.waw.pl/RA123456.7z');
                done();
            })
            .catch(done);
    });
});
