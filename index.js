'use strict';
const Alexa = require('alexa-sdk');
const awsSDK = require('aws-sdk');
const promisify = require('es6-promisify');

const itemsTable = 'Items';
const docClient = new awsSDK.DynamoDB.DocumentClient();

const handlers = {
  
  'LaunchRequest': function() {
  
    const deviceId = this.event.context.System.device.deviceId;
    const accessToken = this.event.context.System.apiAccessToken;
  
    const xhttp = new XMLHttpRequest();
    xhttp.open('GET', `https://api.amazonalexa.com/v1/devices/${deviceId}/settings/address`, true);
    xhttp.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhttp.setRequestHeader('contentType', `application/json`);
    xhttp.send();
    const locationData = xhttp.response;
    
    this.emit(':ask', locationData);
  },
 
  'StoreItemIntent': function () {
    let emitOO = this.emit;
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

    if (!slots.Place.value) {
      const slotToElicit = 'Place';
      const speechOutput = 'Where is the item stored?';
      const repromptSpeech = 'Please give me a location of the item.';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }
    else if (slots.Place.confirmationStatus !== 'CONFIRMED') {

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
      TableName: itemsTable,
      Item:{
        "userId": userId,
        "itemName": slots.Item.value,
        "locationName": slots.Place.value
      }
    };
    docClient.put(params, function(err, data) {
      if (err) {
        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        console.log("Added item:", JSON.stringify(data, null, 2));
        emitOO(':tell', "success");
      }
    });
  }
};


exports.handler = function (event, context, callback) {
  const alexa = Alexa.handler(event, context, callback);
  alexa.registerHandlers(handlers);
  alexa.execute();
};

