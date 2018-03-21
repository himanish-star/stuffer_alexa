"use strict"

const Alexa = require('alexa-sdk');

module.exports.handler = (event, context) => {
  const alexa = Alexa.handler(event, context);
  alexa.appId = APP_ID // APP_ID is your skill id which can be found in the Amazon developer console where you create the skill.
  alexa.registerHandlers(handlers);
  alexa.execute();
}

const handlers = {
    'FindItemIntent' : function() {
        this.response.speak('What would you like to find?');
        this.emit(':ask', ':responseReady');
    },

    'StoreItemIntent' : function() {
        this.response.speak('What would you like to store?');
        this.emit(':responseReady');
    },

    'StoreEventItem' : function() {
        //build response first using responseBuilder and then emit
        this.response.speak('Hello World!');
        this.emit(':responseReady');
    },
    'ListEventItem' : function() {
        //build response first using responseBuilder and then emit
        this.response.speak('Hello World!');
        this.emit(':responseReady');
    }
};
