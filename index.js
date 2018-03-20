"use strict"

const Alexa = require('alexa-sdk');

const handlers = {
  "LaunchRequest": () => {

  }
}

module.exports.handler = (event, context) => {
  const alexa = Alexa.handler(event, context);
  alexa.registerHandlers(handlers);
  alexa.execute();
}
