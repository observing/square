var Logger = require('../')
  , logger = new Logger;

function namespacing () {
  logger.debug('debug message');
  logger.log('logging an array', []);
  logger.info('info message with object', {});
  logger.notice('sending a notice', 1, 2, 3)
  logger.metric('already send', logger.calls, 'logs')
  logger.warning('odear, we are going to break something', new Error());
  logger.error('something bad happend', new Error());
  logger.critical('oh FUCK the system is melting down');
  logger.alert('call the police!');
}

setTimeout(function showoff () {
  namespacing();
}, 100);
