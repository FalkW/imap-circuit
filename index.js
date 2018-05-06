'use strict';

// load configuration
var config = require('./config.json');

console.log(config);

// logger
var bunyan = require('bunyan');

// node utils
var util = require('util');

// SDK logger
var sdkLogger = bunyan.createLogger({
    name: 'sdk',
    stream: process.stdout,
    level: config.sdkLogLevel
});

// Application logger
var logger = bunyan.createLogger({
    name: 'app',
    stream: process.stdout,
    level: 'debug'
});

// Circuit SDK
logger.info('[CIRCUIT]: get Circuit instance');
var Circuit = require('circuit-sdk');

logger.info('[CIRCUIT]: Circuit set bunyan logger');
Circuit.setLogger(sdkLogger);


//Imap
var Imap = require('imap');
var inspect = require('util').inspect;



//*********************************************************************
//* Mail-Circuit-Adapter
//*********************************************************************
var MailToCircuitAdapter = function () {

    var self = this;
    var client = null;

    //*********************************************************************
    //* Circuit - logonBot
    //*********************************************************************
    this.logon = function logon() {
        logger.info('[CIRCUIT]: logon');
        return new Promise(function (resolve, reject) {
            logger.info('[CIRCUIT]: createClient');
            client = new Circuit.Client({
                client_id: config.client_id,
                client_secret: config.client_secret,
                domain: config.domain,
                autoRenewToken: true
            });
            self.addEventListeners(client); //register evt listeners
            client.logon()
                .then(function loggedOn(user) {
                    logger.info('[CIRCUIT]: loggedOn', user);
                    return client.setPresence({state: Circuit.Enums.PresenceState.AVAILABLE});
                })
                .then(user => {
                    console.log('Presence updated', user);
                    resolve();
                })
                .catch(reject);
        });
    };

    //*********************************************************************
    //* IMAP - logon
    //*********************************************************************
    
    logger.info('[IMAP]: logon');

    var imap = new Imap({
      user: config.imap_user,
      password: config.imap_password,
      host: config.imap_host,
      port: config.imap_port,
      tls: config.imap_tls
    });

    //*********************************************************************
    //* Circuit - addEventListeners
    //*********************************************************************
    this.addEventListeners = function addEventListeners(client) {
        logger.info('[CIRCUIT]: addEventListeners');
        //set event callbacks for this client
        client.addEventListener('connectionStateChanged', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('registrationStateChanged', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('reconnectFailed', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('itemAdded', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('itemUpdated', function (evt) {
            self.logEvent(evt);
        });
    };

    //*********************************************************************
    //* Circuit - logEvent -- helper
    //*********************************************************************
    this.logEvent = function logEvent(evt) {
        logger.info('[CIRCUIT]:', evt.type, 'event received');
        logger.debug('[CIRCUIT]:', util.inspect(evt, { showHidden: true, depth: null }));
    };

    //*********************************************************************
    //* Circuit - Post Message
    //*********************************************************************
    this.postMessage = async function (text, parentid, conversationID) {
        logger.info('[CIRCUIT]: SEND MESSAGE: ', text, parentid, conversationID);
        var message = {
            content: text,
            parentId: parentid
        };
        return client.addTextItem(conversationID, message);
    };
};

//*********************************************************************
//* run
//*********************************************************************
function run() {

    var mailToCircuitAdapter = new MailToCircuitAdapter();

    mailToCircuitAdapter.logon()
        .catch(function (e) {
            logger.error('[CIRCUIT]:', e);
        })
    ;
}

//******************************************************************
//* main
//*********************************************************************
run();
