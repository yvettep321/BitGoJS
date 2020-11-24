// eslint-disable-next-line
/// <reference types="mocha" />
import * as should from 'should';

import 'should-http';
import 'should-sinon';
import '../lib/asserts';

import * as nock from 'nock';
import { Environments } from 'bitgo';
import { handleV2ConsolidateAccount } from '../../src/clientRoutes';

const expressApp = require('../../src/expressApp').app;
const request = require('supertest-as-promised');

const { BitGo } = require('bitgo');

const oldFetchConstants = BitGo.prototype.fetchConstants;
BitGo.prototype.fetchConstants = function() {
  nock(this._baseUrl)
    .get('/api/v1/client/constants')
    .reply(200, { ttl: 3600, constants: {} });

  // force client constants reload
  BitGo.prototype._constants = undefined;

  return oldFetchConstants.apply(this, arguments);
};

describe('Bitgo Express', function() {

  const baseUri = Environments['mock'].uri;

  const nockServer = () => {
    nock.disableNetConnect();

    const args = {
      debug: false,
      env: 'mock',
      logfile: '/dev/null',
    };

    const app = expressApp(args);
    request.agent(app);
  };

  before(() => {
    nockServer();
  });

  describe('Consolidate account', async () => {

    it('should fail on invalid array in body addresses', async () => {
      const consolidateAddresses = 'someAddr';
      const coinName = 'talgo';
      const walletId = '23423423423423';

      const mockRequest = {
        bitgo: new BitGo({ env: 'mock' }),
        params: {
          coin: 'talgo',
          id: walletId,
        },
        body: {
          consolidateAddresses: null,
        }
      } as any;

      nock(baseUri)
        .get(`/api/v2/${coinName}/wallet/${walletId}`)
        .reply(200, {});

      nock(baseUri)
        .post(`/api/v2/${coinName}/wallet/${walletId}/consolidateAccount`, { consolidateAddresses })
        .reply(200, { ttl: 3600, constants: {} });

      const consolidation = handleV2ConsolidateAccount(mockRequest);

      should.exist(consolidation);
    });
  });
});
