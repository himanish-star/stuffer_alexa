'use strict';
const Alexa = require('alexa-sdk');

const handlers = {
  'StoreItemIntent': function () {

    const { userId } = this.event.session.user;
    const { slots } = this.event.request.intent;
    // ItemName
    if (!slots.Item.value) {
      const slotToElicit = 'Item';
      const speechOutput = 'What is the item to be stored?';
      const repromptSpeech = 'Please tell me the name of the item';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }
    else if (slots.Item.confirmationStatus !== 'CONFIRMED') {

      if (slots.Item.confirmationStatus !== 'DENIED') {
        // slot status: unconfirmed
        const slotToConfirm = 'Item';
        const speechOutput = `The name of the item is ${slots.Item.value}, correct?`;
        const repromptSpeech = speechOutput;
        return this.emit(':confirmSlot', slotToConfirm, speechOutput, repromptSpeech);
      }

      const slotToElicit = 'Item';
      const speechOutput = 'What is the item you would like to store?';
      const repromptSpeech = 'Please tell me the name of the item';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }
    else {
      this.emit(":tell", 'hope');
    }
  }
};


exports.handler = function (event, context, callback) {
  const alexa = Alexa.handler(event, context, callback);
  alexa.registerHandlers(handlers);
  alexa.execute();
};

