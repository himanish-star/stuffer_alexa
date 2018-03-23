const Alexa = require('alexa-sdk');
const awsSDK = require('aws-sdk');
const promisify = require('es6-promisify');

const itemsTable = 'Items';
const docClient = new awsSDK.DynamoDB.DocumentClient();

// convert callback style functions to promises
const dbScan = promisify(docClient.scan, docClient);
const dbGet = promisify(docClient.get, docClient);
const dbPut = promisify(docClient.put, docClient);
const dbDelete = promisify(docClient.delete, docClient);

//TODO: Add more instructions as suited
const instructions = `Welcome to Stuff locator<break strength="medium" />
                      The following commands are available: store item, find item... What
                      would you like to do?`;

const handlers = {
  'LaunchRequest'() {
    this.emit(':ask', instructions);
  },
  //todo: utterances which fire this intent
  //find my {Item}
  'FindItemIntent'() {
    const { slots } = this.event.request.intent;

    // prompt for slot data if needed
    if (!slots.Item.value) {
      const slotToElicit = 'ItemName';
      const speechOutput = 'What is the name of the item?';
      const repromptSpeech = 'Please tell me the name of the item to be found';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }

    const { userId } = this.event.session.user;
    const itemName = slots.Item.value;
    const dynamoParams = {
      TableName: itemsTable,
      Key: {
        itemName: itemName,
        userId: userId
      }
    };

    console.log('Attempting to read data');

    // query DynamoDB
    dbGet(dynamoParams)
      .then(data => {
        console.log('Get item succeeded', data);

        const item = data.Item;

        if (item) {
          this.emit(':tell', `Item ${itemName} is located in ${item.itemLocation}`);
        }
        else {
          this.emit(':tell', `Item ${itemName} not found!`);
        }
      })
      .catch(err => console.error(err));
  },
  //todo: utterances which fire this intent
  //place my {Item} inside {Place}
  'StoreItemIntent': function () {

    const { userId } = this.event.session.user;
    const { slots } = this.event.request.intent;

    // ItemName
    if (!slots.Item.value) {
      const slotToElicit = 'ItemName';
      const speechOutput = 'What is the item to be stored?';
      const repromptSpeech = 'Please tell me the name of the item';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }
    else if (slots.Item.confirmationStatus !== 'CONFIRMED') {

      if (slots.Item.confirmationStatus !== 'DENIED') {
        // slot status: unconfirmed
        const slotToConfirm = 'ItemName';
        const speechOutput = `The name of the item is ${slots.Item.value}, correct?`;
        const repromptSpeech = speechOutput;
        return this.emit(':confirmSlot', slotToConfirm, speechOutput, repromptSpeech);
      }

      // slot status: denied -> reprompt for slot data
      const slotToElicit = 'ItemName';
      const speechOutput = 'What is the item you would like to store?';
      const repromptSpeech = 'Please tell me the name of the item';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }

    // ItemLocation
    if (!slots.Place.value) {
      const slotToElicit = 'ItemLocation';
      const speechOutput = 'Where is the item stored?';
      const repromptSpeech = 'Please give me a location of the item.';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }
    else if (slots.Place.confirmationStatus !== 'CONFIRMED') {

      if (slots.Place.confirmationStatus !== 'DENIED') {
        // slot status: unconfirmed
        const slotToConfirm = 'ItemLocation';
        const speechOutput = `The item location is ${slots.Place.value}, correct?`;
        const repromptSpeech = speechOutput;
        return this.emit(':confirmSlot', slotToConfirm, speechOutput, repromptSpeech);
      }

      // slot status: denied -> reprompt for slot data
      const slotToElicit = 'ItemLocation';
      const speechOutput = 'Where can the item be found?';
      const repromptSpeech = 'Please give me a location where the item is stored.';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }

    // all slot values received and confirmed, now add the record to DynamoDB
    const name = slots.Item.value;
    const location = slots.Place.value;
    const dynamoParams = {
      TableName: itemsTable,
      Item: {
        itemName: name,
        userId: userId,
        itemLocation: location
      }
    };

    const checkIfItemExistsParams = {
      TableName: itemsTable,
      Key: {
        itemName: name,
        userId: userId
      }
    };

    console.log('Attempting to add item', dynamoParams);

    // query DynamoDB to see if the item exists first
    dbGet(checkIfItemExistsParams)
      .then(data => {
        console.log('Get item succeeded', data);

        const item = data.Item;

        if (item) {
          const errorMsg = `Item ${name} already exists!`;
          this.emit(':tell', errorMsg);
          throw new Error(errorMsg);
        }
        else {
          // no match, add the item
          return dbPut(dynamoParams);
        }
      })
      .then(data => {
        console.log('Add item succeeded', data);

        this.emit(':tell', `Item ${name} added!`);
      })
      .catch(err => {
        console.error(err);
      });
  },

    'Unhandled'() {
    console.error('problem', this.event);
    this.emit(':ask', 'An unhandled problem occurred!');
  },

  'AMAZON.HelpIntent'() {
    const speechOutput = "Start by ";
    const reprompt = instructions;
    this.emit(':ask', speechOutput, reprompt);
  },

  'AMAZON.CancelIntent'() {
    this.emit(':tell', 'Goodbye!');
  },

  'AMAZON.StopIntent'() {
    this.emit(':tell', 'Goodbye!');
  }
};

module.exports.handler = (event, context) => {
  const alexa = Alexa.handler(event, context);
  alexa.registerHandlers(handlers);
  alexa.execute();
};