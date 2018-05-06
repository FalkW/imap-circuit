'use strict';

// load configuration
const config = require('./config.json');

console.log(config);

// logger
const bunyan = require('bunyan');

// node utils
const util = require('util');

//markdown remover
const removeMd = require('remove-markdown');

// SDK logger
const sdkLogger = bunyan.createLogger({
    name: 'sdk',
    stream: process.stdout,
    level: config.sdkLogLevel
});

// Application logger
const logger = bunyan.createLogger({
    name: 'app',
    stream: process.stdout,
    level: 'debug'
});

// Circuit SDK
logger.info('[CIRCUIT]: get Circuit instance');
const Circuit = require('circuit-sdk');

logger.info('[CIRCUIT]: Circuit set bunyan logger');
Circuit.setLogger(sdkLogger);


//Imap
const imaps = require('imap-simple');

//*********************************************************************
//* Circuit-Adapter
//*********************************************************************
var fCircuit = function () {

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
    this.postMessage = async function (content, subject, conversationID) {
        logger.info('[CIRCUIT]: SEND MESSAGE: ', content, subject, conversationID);
        var message = {
            content: content,
            subject: subject
        };
        return client.addTextItem(conversationID, message);
    };
};

//*********************************************************************
//* run
//*********************************************************************
function run() {

  var imapconfig = {
    imap: {
      user: config.imap_user,
      password: config.imap_password,
      host: config.imap_host,
      port: config.imap_port,
      tls: config.imap_tls,
      authTimeout: 3000
    },
    onmail: function (numNewMail) {
      logger.info('[IMAP]: NEW MAIL RECEIVED');


      var fetchconfig = {
        imap: {
          user: config.imap_user,
          password: config.imap_password,
          host: config.imap_host,
          port: config.imap_port,
          tls: config.imap_tls,
          authTimeout: 3000
        }
      }

      imaps.connect(fetchconfig).then(function (fetchconnection) {

        return fetchconnection.openBox('INBOX').then(function () {
          var searchCriteria = [
             'UNSEEN'
          ];
    
          var fetchOptions = {
             bodies: ['HEADER.FIELDS (FROM TO SUBJECT)', '1'],
             markSeen: true,
             struct: true
         };
    
         return fetchconnection.search(searchCriteria, fetchOptions).then(function (messages) {

            console.log(util.inspect(messages, false, null))

            var subjects = []
            var senders = []
            var recipients = []
            var text = []

            //Get array of subjects
            subjects = messages.map(function (res) {
                return res.parts.filter(function (part) {
                    return part.which === 'HEADER.FIELDS (FROM TO SUBJECT)';
                })[0].body.subject[0];
            });
            console.log(`SUBJECTS: ${subjects}`);

            //Get array of senders
            senders = messages.map(function (res) {
                return res.parts.filter(function (part) {
                    return part.which === 'HEADER.FIELDS (FROM TO SUBJECT)';
                })[0].body.from[0];
            });
            console.log(`SENDERS: ${senders}`);

            //Get array of recipients
            recipients = messages.map(function (res) {
                return res.parts.filter(function (part) {
                    return part.which === 'HEADER.FIELDS (FROM TO SUBJECT)';
                })[0].body.to[0];
            });
            console.log(`RECEIPIENTS: ${recipients}`);

            //Get array of texts
            text = messages.map(function (res) {
                return res.parts.filter(function (part) {
                    return part.which === '1';
                })[0].body;
            });
            console.log(`TEXT: ${text}`);

            //walk through array and send messages

            for (var i = 0, len = subjects.length; i < len; i++) {

                var circuit_conversationID = '';
                var circuit_subject = '';
                var circuit_sender = '';
                var circuit_text = '';

                //Extract ConversationID from to-address if using a static 1-to-1 connection enter target conversationID here
                //e.g. circuit_conversationID = '0dedc2ce-733f-4fcc-a7dd-60d3b1e0a1c1';

                circuit_conversationID = `${recipients[i]}`;
                circuit_conversationID = circuit_conversationID.replace('@gmail.com','');
                circuit_conversationID = circuit_conversationID.replace('circuitconv+','');
                
                circuit_subject = `${subjects[i]}`;

                //Make the Name look a little nicer
                circuit_sender = `${senders[i]}`;
                circuit_sender = circuit_sender.replace('>','');
                circuit_sender = circuit_sender.replace('<','- ');

                circuit_text = `${text[i]}`;

                //Compose message
                var circuit_message = `${circuit_text} \n\n${circuit_sender}`;

                console.log(`MESSAGE #${i}: CONV: ${circuit_conversationID}, SUBJECTS: ${circuit_subject}, MESSAGE: ${circuit_message}`);

                circuit.postMessage(circuit_message, circuit_subject, circuit_conversationID);
            }
         });

         return fetchconnection.end();
        });
      });
    }
  };

  
  imaps.connect(imapconfig).then(function (connection) {

    return connection.openBox('INBOX').then(function () {

    });

  }); 

  var circuit = new fCircuit();

    circuit.logon()
        .catch(function (e) {
            logger.error('[CIRCUIT]:', e);
        })
    ; 
}

//******************************************************************
//* main
//*********************************************************************
run();
