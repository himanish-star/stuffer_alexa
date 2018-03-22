'use strict';
const Alexa = require('alexa-sdk');

const handlers = {
  'LaunchRequest': function () {
    //todo: greet the user if an existing one by checking sessions
    this.response.speak('Hello Sir, what would you like to do?').listen();
    this.emit(':responseReady');
  },
  //todo: utterances which fire this intent
  //find my {Item}
  'FindItemIntent': function () {
    const itemSlot = this.event.request.intent.slots.Item;
    let findItemName = '',
      speechOutput = '',
      rePromptOutput = '';

    if(itemSlot && itemSlot.value){
      findItemName = itemSlot.value.toLowerCase();
    }

    //call search function here that step by step searches for the item as we had decided at all cases
    let location = JSON.parse(this.attributes.originalList).itemLocation;

    if (location) {
      speechOutput = findItemName + " is kept at " + location;
      this.emit(":tell", speechOutput);
    } else {
      if (findItemName) {
        speechOutput = "I'm sorry, I currently do not know where" + findItemName + " is stored. What else can I help with?";
      } else {
        speechOutput = "I'm sorry, I currently do not know its location. What else can I help with?";
      }
      rePromptOutput = "What else can I help with?";
      this.emit(":ask", speechOutput, rePromptOutput)
    }
  },
  //todo: utterances which fire this intent
  //place my {Item} inside {Place}
  'StoreItemIntent': function () {
    const itemSlot = this.event.request.intent.slots.Item;
    const locationSlot = this.event.request.intent.slots.Place;
    let storeItemName = '',
      storeItemLocation = '';

    if(itemSlot && itemSlot.value && locationSlot && locationSlot.value) {
      storeItemName = itemSlot.value.toLowerCase();
      storeItemLocation = locationSlot.value.toLowerCase();
      //call store function here that stores in ActiveList as well as MasterDb (we can implement concept of paging for updating masterDB)
      this.attributes.originalList = JSON.stringify({
        itemName: storeItemName,
        itemLocation: storeItemLocation
      });
    }
    console.log('shm', this.attributes.originalList);

    let speechOutput = '',
      rePromptOutput = '';

    if(storeItemLocation && storeItemName) {
      //set speech according to what was not identified
      speechOutput = storeItemName + " has been stored at " + storeItemLocation;
      this.emit(":tell", speechOutput);
    } else {
      if (!storeItemName) {
        speechOutput = "I'm sorry, I currently do not know what to store" ;
      } else {
        speechOutput = "I'm sorry, I currently do not know where to store. What else can I help with?";
      }
      rePromptOutput = "What else can I help with?";
      this.emit(":ask", speechOutput, rePromptOutput)
    }
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


exports.handler = function (event, context, callback) {
  const alexa = Alexa.handler(event, context, callback);
  alexa.dynamoDBTableName = 'Stuffer';
  alexa.registerHandlers(handlers);
  alexa.execute();
};
/*
const Alexa = require('alexa-sdk');
const startSearch = require('searchingItem').startSearch;
const storeItem = require('storingItem').storeItem;

const handlers = {
  'LaunchRequest': function () {
    //todo: greet the user if an existing one by checking sessions
    this.response.speak('Hello Sir, what would you like to do?').listen();
    this.emit(':responseReady');
  },
  //todo: utterances which fire this intent
  //find my {Item}
  'FindItemIntent': function () {
    const itemSlot = this.event.request.intent.slots.Item;
    let findItemName = '',
      speechOutput = '',
      rePromptOutput = '';
    
    if(itemSlot && itemSlot.value){
      findItemName = itemSlot.value.toLowerCase();
    }
    
    //call search function here that step by step searches for the item as we had decided at all cases
    let location = startSearch(findItemName, JSON.parse(this.attributes['original-list']));
    
    if (location) {
      speechOutput = findItemName + " is kept at " + location;
      this.emit(":tell", speechOutput);
    } else {
      if (findItemName) {
        speechOutput = "I'm sorry, I currently do not know where" + findItemName + " is stored. What else can I help with?";
      } else {
        speechOutput = "I'm sorry, I currently do not know its location. What else can I help with?";
      }
      rePromptOutput = "What else can I help with?";
      this.emit(":ask", speechOutput, rePromptOutput)
    }
  },
  //todo: utterances which fire this intent
  //place my {Item} inside {Place}
  'StoreItemIntent': function () {
    const itemSlot = this.event.request.intent.slots.Item;
    const locationSlot = this.event.request.intent.slots.Place;
    let storeItemName = '',
      storeItemLocation = '';
  
    if(itemSlot && itemSlot.value && locationSlot && locationSlot.value) {
      storeItemName = itemSlot.value.toLowerCase();
      storeItemLocation = locationSlot.value.toLowerCase();
      //call store function here that stores in ActiveList as well as MasterDb (we can implement concept of paging for updating masterDB)
      this.attributes['original-list'] = JSON.stringify(storeItem(storeItemName, storeItemLocation));
    }
    console.log('shm', this.attributes['original-list']);
    
    let speechOutput = '',
      rePromptOutput = '';
  
    if(storeItemLocation && storeItemName) {
      //set speech according to what was not identified
      speechOutput = storeItemName + " has been stored at " + storeItemLocation;
      this.emit(":tell", speechOutput);
    } else {
      if (!storeItemName) {
        speechOutput = "I'm sorry, I currently do not know what to store" ;
      } else {
        speechOutput = "I'm sorry, I currently do not know where to store. What else can I help with?";
      }
      rePromptOutput = "What else can I help with?";
      this.emit(":ask", speechOutput, rePromptOutput)
    }
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

module.exports.handler = (event, context, callback) => {
  const alexa = Alexa.handler(event, context, callback);
  // todo: fill this up when APP_ID is ready
  // alexa.appId = APP_ID;
  // APP_ID is your skill id which can be found in the Amazon developer console where you create the skill.
  alexa.dynamoDBTableName = 'Stuffer';
  alexa.registerHandlers(handlers);
  alexa.execute();
};

*/
