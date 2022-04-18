const {describe, before, it} = require('mocha');
const EventFetcher = require('../lib/eventFetcher')
const assert = require('assert');
const expect = require('chai').expect
var sinon = require('sinon')
var compareVersions = require('compare-versions');
const Web3 = require('web3');
const erc20ABI = require('human-standard-token-abi')
const contract = require('@truffle/contract')

const OKExAddress = '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b'
const HuobiAddress = '0x1062a747393198f70f71ec65a582423dba7e5ab3'

/*
    Note: These tests require a main network node to run and accept websocket connections at below url
*/
const web3Connection = 'ws://geth.dappnode:8546'

describe('Check web3 availability', function(){
    let web3
    before('initialize web3 connection', function() {
        web3 = new Web3(web3Connection);
    })

    it ('gets correct version', function() {
        const expectedVersion = '1.x.x'
        const version = web3.version
        assert(compareVersions(version, expectedVersion) === 0)
    })

    it('gets a somewhat current block', async function() {
        const block = await web3.eth.getBlockNumber()
        assert(block>8662000)
    })
})

describe('check eventFetcher', function() {
    let contractInstance
    const tetherUSDTAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7'
    let eventFetcher = new EventFetcher()
    let web3

    before('initialize web3 connection', function() {
        web3 = new Web3(web3Connection);
    })

    before('initialize Tether ERC20 contract', async function() {
        const ERC20Contract = contract({abi: erc20ABI})
        ERC20Contract.setProvider(web3.currentProvider)
        contractInstance = await ERC20Contract.at(tetherUSDTAddress)
    })

    afterEach(() => {
        // Restore the default sandbox
        sinon.restore();
    });

    it ('fetches expected number of "Approval" events', async function() {
        // some constants from live network
        const fromBlock = 8661209
        const toBlock = 8662209
        // In this blockrange there are 40 "approval" events of the TUSD contract
        const expectedApprovalEvents = 40

        // set comfortable timeout for slow node
        this.timeout(10000);

        const fetchOptions = {
            contract: contractInstance,
            eventName: 'Approval',
            fromBlock,
            toBlock,
        }
        let events = await eventFetcher.fetch(fetchOptions)
        expect(events).to.have.lengthOf(expectedApprovalEvents)
    })

    it ('correctly filters "Transfer" events', async function() {
        // some constants from live network
        const fromBlock = 8661240
        const toBlock = 8662230
        const expectedTransferEvents = 455  // There are 455 transfer events from Huobi/OKEx within this blockrange

        const progressCallback = sinon.fake()
        const expectedCallbacks = 10 // default chunksize is 100 blocks -> 990 blocks/100 = 9.9 rounded up to 10

        // set comfortable timeout for slow node
        this.timeout(10000);

        const fetchOptions = {
            contract: contractInstance,
            eventName: 'Transfer',
            filter: {_from: [OKExAddress, HuobiAddress]},
            fromBlock,
            toBlock,
            progressCallback: progressCallback,
            // chunkSize: undefined,
        }
        let events = await eventFetcher.fetch(fetchOptions)
        expect(events).to.have.lengthOf(expectedTransferEvents)
        sinon.assert.callCount(progressCallback,expectedCallbacks)
    })

    it ('accepts chunksize argument', async function() {
        // some constants from live network
        const fromBlock = 8661240
        const toBlock = 8662230

        const progressCallback = sinon.fake()
        const chunkSize = 61
        const expectedCallbacks = 17 // chunksize is 61 blocks -> 990 blocks/61 = 16.22 rounded up to 17

        // set comfortable timeout for slow node
        this.timeout(10000);

        const fetchOptions = {
            contract: contractInstance,
            eventName: 'Transfer',
            filter: {_from: [OKExAddress, HuobiAddress]},
            fromBlock,
            toBlock,
            progressCallback: progressCallback,
            chunkSize: chunkSize,
        }
        await eventFetcher.fetch(fetchOptions)
        sinon.assert.callCount(progressCallback,expectedCallbacks)
    })

    it ('Returns 0 events when cancelled', async function() {
        const fromBlock = 8661240
        const toBlock = 8662230
        let callbackCount = 0;

        // When the first progressCallback comes in, trigger cancel
        const progressCallback = function() {
            callbackCount++;
            eventFetcher.cancel()
        }

        const fetchOptions = {
            contract: contractInstance,
            eventName: 'Transfer',
            filter: {_from: [OKExAddress, HuobiAddress]},
            fromBlock,
            toBlock,
            progressCallback: progressCallback,
        }
        let events = await eventFetcher.fetch(fetchOptions)

        // There should be no events returned as we cancelled the fetching
        expect(events).to.have.lengthOf(0)

        // progress Callback should only be called once
        expect(callbackCount).to.equal(1)
    })
})

