'use strict';
const Alexa = require('alexa-sdk');
const awsSDK = require('aws-sdk');
const promisify = require('es6-promisify');
const thesaurus = require('thesaurus-com');

const itemsTable = 'Items';
const docClient = new awsSDK.DynamoDB.DocumentClient();
const instructions = `Welcome to Stuff locator<break strength="medium" />
                      The following commands are available: store item, find item... What
                      would you like to do?`;

const handlers = {
// <<<<<<< HEAD
  'LaunchRequest': function() {
    this.emit(':ask', instructions);
  },
  //todo: utterances which fire this intent
  //find my {Item}
  'FindItemIntent'() {
    const { slots } = this.event.request.intent;

    // prompt for slot data if needed
    if (!slots.Item.value) {
      const slotToElicit = 'Item';
      const speechOutput = 'What is the name of the item you are looking for?';
      const repromptSpeech = 'Please tell me the name of the item to be found';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }
  
    //perform searches in active list then in the dynamoDB
    //step by step
    //1. Direct Match in Active List imported above
    //2. Searching of 5 synonyms in activeList
    //3. check Up if if itemName exists in masterDB -> give out probable places
    //4. check up if confirmed synonym exists in masterDB or not
    //5. Scope for recursive searches
    //6. Send a not found flag now
    
    const { userId } = this.event.session.user;
    const itemName = slots.Item.value;

    console.log('Attempting to read data in activeList');
  
    //todo: search active list. (write code once SHM implements it)
    // if(!found)
  
    console.log('Attempting to read data of synonyms in activeList');
  
    const synonyms = thesaurus.search(itemName).synonyms;
    const requiredSynonyms = [];
    synonyms.forEach(function (synonym) {
      
      //todo: we need a way to filterOut unnecessary synonyms and keep only required.
      // We might for once filter by keeping only the ones existing in activeList.
      // But then there can be cases when an item exists in DB but not activeList.
      // Also, direct prompting could irritate the user
      //todo: after filtering do this: requiredSynonyms.push(synonym)

      if(activeList.includes(synonym)) {
        //todo: you won't require this: (requiredSynonyms.push(synonym))
        // prompt user were u talking about this synonym
        // if yes, tell its location else continue()
      }
    });
    
    // if still !found
  
    console.log('Attempting to read data in DB for probable places');
  
    let locationFound = searchDynamo(itemName, userId);
  
    console.log('Attempting to read data of synonyms in DB for probable places');

    if (!locationFound) {
      requiredSynonyms.forEach(function (synonym) {
        // prompt user  were u talking about this synonym
        // if yes, tell its probable location else continue()
  
        let synLocation = searchDynamo(synonym, userId);
        // whenever synlocation Flag is true, continue();
      })
    }
  
    //recursive searches should be covered in searchIntent itself

    function searchDynamo (itemName, userId) {
  
      const dynamoParams = {
        TableName: itemsTable,
        Key: {
          Name: itemName,
          UserId: userId
        }
      };
  
      // query DynamoDB
      dbGet(dynamoParams)
        .then(data => {
          console.log('Get item succeeded', data);
      
          const item = data.Item;
          
          let foundFlag = false;
          
          if (item) {
            
            item.Location.join(", or, "); //as this will be an array of all probable places
            
            this.emit(':tell', `Item ${itemName} might be located at ${item.Location}`);
            // wait for user to confirm. If he/she confirms then
            foundFlag = true;
          }
          else {
            this.emit(':tell', `History of ${itemName} not found!`);
          }
          
          return foundFlag;
          
        })
        .catch(err => console.error(err));
    }
    
    
  },
  //todo: utterances which fire this intent
  //place my {Item} inside {Place}
// =======
// >>>>>>> 3fee8f8ca60e5656133e6ad2de2ccbae122496fc
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

