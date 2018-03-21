"use strict";

const Alexa = require('alexa-sdk');

module.exports.handler = (event, context) => {
  const alexa = Alexa.handler(event, context);
  alexa.appId = APP_ID; // APP_ID is your skill id which can be found in the Amazon developer console where you create the skill.
  alexa.registerHandlers(handlers);
  alexa.execute();
};

const handlers = {
  'LaunchRequest': function () {
    //todo: greet the user if an existing one
    this.response.speak('Hello Sir, what would you like to do?').listen();
    this.emit(':responseReady');
  },
  //where have I kept my {stuff}
  'FindItemIntent': function () {
    this.response.speak('What would you like to find?').listen();
    this.emit(':responseReady');
  },
  //I am storing my {stuff} in {location}
  'StoreItemIntent': function () {
    this.response.speak('What would you like to store?').listen();
    this.emit(':responseReady');
  },
  //todo: to be decided
  'StoreEventItem': function () {
    this.response.speak('Hello World!');
    this.emit(':responseReady');
  },
  //todo: to be decided
  'ListEventItem': function () {
    this.response.speak('Hello World!');
    this.emit(':responseReady');
  }
};