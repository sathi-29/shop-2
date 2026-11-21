const name = (process.env.ADAPTER || 'mock').toLowerCase();
module.exports = name === 'custom' ? require('./custom') : require('./mock');
