'use strict';
const Alexa = require('alexa-sdk');
const awsSDK = require('aws-sdk');
//todo: es6-promisify is now out with a newer version, so update your code with the newer version of the API.
const promisify = require('es6-promisify');

const itemsTableName = 'Items';
const documentClient = new awsSDK.DynamoDB.DocumentClient();

const handlers = {
  'FindItemIntent': function () {
    //todo: use Prakriti's code and ask Shikhar to verify her code
    //todo: Shikhar will implement this
    this.emit(":tell", "this part is yet to be implemented, ask the developer")
  },
  'StoreItemIntent': function () {
    let emitCopy = this.emit;
    const { userId } = this.event.session.user;
    const { slots } = this.event.request.intent;

    // name of the item
    if (!slots.Item.value) {
      const slotToElicit = 'Item';
      const speechOutput = 'What is the item to be stored?';
      const repromptSpeech = 'Please tell me the name of the item';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    } else if (slots.Item.confirmationStatus !== 'CONFIRMED') {
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

    //name of the place where the item is to be stored
    if (!slots.Place.value) {
      const slotToElicit = 'Place';
      const speechOutput = 'Where is the item stored?';
      const repromptSpeech = 'Please give me a location of the item.';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    } else if (slots.Place.confirmationStatus !== 'CONFIRMED') {
      if (slots.Place.confirmationStatus !== 'DENIED') {
        // slot status: unconfirmed
        const slotToConfirm = 'Place';
        const speechOutput = `The item location is ${slots.Place.value}, correct?`;
        const repromptSpeech = speechOutput;
        return this.emit(':confirmSlot', slotToConfirm, speechOutput, repromptSpeech);
      }

      // slot status: denied -> reprompt for slot data
      const slotToElicit = 'Place';
      const speechOutput = 'Where can the item be found?';
      const repromptSpeech = 'Please give me a location where the item is stored.';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }

    let params = {
      TableName: itemsTableName,
      Item:{
        "userId": userId,
        "itemName": slots.Item.value,
        "locationName": slots.Place.value
      }
    };
    //todo: Prakriti's method of first searching and then storing. But this will be done once the database table design has been finalized.
    //todo: Promisify to be used here(check how to use the new API)
    documentClient.put(params, function(err, data) {
      if (err) {
        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        emitCopy(':tell', "oops! something went wrong");
      } else {
        console.log("Added item:", JSON.stringify(data, null, 2));
        emitCopy(':tell', `your ${slots.Item.value} has been stored at ${slots.Place.value}`);
      }
    });
  }
};


exports.handler = function (event, context, callback) {
  const alexa = Alexa.handler(event, context, callback);
  alexa.registerHandlers(handlers);
  alexa.execute();
};

