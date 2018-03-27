'use strict';
const Alexa = require('alexa-sdk');
const awsSDK = require('aws-sdk');
const thesaurus = require('thesaurus-com');
//todo: es6-promisify is now out with a newer version, so update your code with the newer version of the API.
//todo: const promisify = require('es6-promisify');

const itemsTableName = 'Items';
const timeStampTableName = 'TimeStamp';
const activeListTableName = 'ActiveList';
const documentClient = new awsSDK.DynamoDB.DocumentClient();
const documentClientNew = new awsSDK.DynamoDB.DocumentClient();
let activeListFetchedStatus = false;
let activeList = []; //todo: this would behave as out cache active List

function fetchActiveListAndCache(userId) {
  const params = {
    TableName: activeListTableName,
    Key: {
      "userId": userId
    }
  };
  documentClient.get(params, function (err, data) {
    if(err) {
      console.log('oops something went wrong', err);
    } else {
      console.log('activeList has been cached');
      activeListFetchedStatus = true;
      activeList = data.Item.activeList;
    }
  })
}

function filterSynonyms(synonyms) {

}

const handlers = {

  'FindItemIntent': function () {
    let emitCopy = this.emit;
    const { userId } = this.event.session.user;
    const { slots } = this.event.request.intent;

    //fetch activeList if not yet
    if(!activeListFetchedStatus) {
      fetchActiveListAndCache(userId);
    }

    //name of the item
    if (!slots.Item.value) {
      const slotToElicit = 'Item';
      const speechOutput = 'What is the item to be found?';
      const repromptSpeech = 'Please tell me the name of the item to be found';
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
      const speechOutput = 'What is the item you would like to find?';
      const repromptSpeech = 'Please tell me the name of the item to be found';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }

    const itemName = slots.ItemName.value;
    let searchFlag = false;
    let requiredSynonyms = [];

    for (let activeMember in activeList) {
      if(activeMember[itemName]) {
        emitCopy(":tell", `your ${itemName} is located at ${activeMember[itemName]}`);
        searchFlag = true;
        break;
      }
    }
    if(!searchFlag) {
      console.log('Attempting to read data of synonyms in activeList');
      const synonyms = thesaurus.search(itemName).synonyms;
      //todo: filter out required synonyms
      requiredSynonyms = filterSynonyms(synonyms);
      requiredSynonyms.forEach(function (synonym) {
        for (let activeMember in activeList) {
          if(activeMember[synonym]) {
            //todo: user has to confirm that this is what he requires, setup dialog model
            emitCopy(":tell", `your ${synonym} is located at ${activeMember[itemName]}`);
            searchFlag = true;
            break;
          }
        }
      });
    }
    if(!searchFlag) {
      console.log('Attempting to read data in Items table');
      let params = {
        TableName: itemsTableName,
        Key:{
          "itemName-userId": slots.Item.value + "-" + userId
        }
      };
      documentClient.get(params, function(err, data) {
        if (err) {
          console.error("Unable to find item. Error JSON:", JSON.stringify(err, null, 2));
          emitCopy(':tell', `oops! something went wrong`);
        } else {
          console.log("Found item:", JSON.stringify(data, null, 2));
          if(data.Item) {
            emitCopy(":tell", `you can find your ${data.Item.itemName} at ${data.Item.locationName}`)
          } else {
            console.log('Attempting to read data of synonyms in Items table');
            requiredSynonyms.forEach(function (synonym) {
              params.Key = {
                "itemName-userId": synonym + "-" + userId
              };
              documentClient.get(params, function(err, data) {
                if(err) {
                  console.error("Unable to find item. Error JSON:", JSON.stringify(err, null, 2));
                  emitCopy(':tell', `oops! something went wrong`);
                } else {
                  if(data.Item) {
                    emitCopy(":tell", `you can find your ${data.Item.itemName} at ${data.Item.locationName}`)
                  }
                }
              });
            });

          }
        }
      });
    }
  },
  
  'StoreItemIntent': function () {
    let emitCopy = this.emit;
    const { userId } = this.event.session.user;
    const { slots } = this.event.request.intent;
    
    fetchExistingTimeStamp(userId);
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
        "itemName-userId": slots.Item.value + "-" + userId,
        "userId": userId,
        "itemName": slots.Item.value,
        "locationName": slots.Place.value
      }
    };
    //todo: (SHM's task) => Prakriti's method of first searching and then storing. But this will be done once the database table design has been finalized.
    //todo: (not required for now)Promisify to be used here(check how to use the new API)
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

function fetchExistingTimeStamp(userId) {
  const timeStampParams = {
    TableName: timeStampTableName,
    Key: {
      "userId": userId
    }
  };
  documentClientNew.get(timeStampParams, function (err, data) {
    if (err) {
      console.error("Time stamp not working", JSON.stringify(err, null, 2));
      checkRenew(false, userId);
    } else {
      console.log("Time Stamp found:", JSON.stringify(data, null, 2));
      checkRenew(data, userId);
    }
  });
}

function checkRenew(data, userId) {
  const date = new Date();
  const currentTimeStamp = date.getTime();
  if(!data.Item) {
    let params = {
      TableName: timeStampTableName,
      Item:{
        "userId": userId,
        "timestamp": currentTimeStamp
      }
    };
    
    documentClientNew.put(params, function(err, data) {
      if (err) {
        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        console.log("Added item:", JSON.stringify(data, null, 2));
      }
    });
  } else {
    if(currentTimeStamp - data.Item.timestamp >= 86400000) {
      let params = {
        TableName: timeStampTableName,
        Item:{
          "userId": userId,
          "timestamp": currentTimeStamp
        }
      };
      documentClientNew.put(params, function(err, data) {
        if (err) {
          console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
          console.log("Added item:", JSON.stringify(data, null, 2));
          copyActiveList();
        }
      });
    }
  }
}

function copyActiveList() {
  //todo: update items database with the activeList
}

exports.handler = function (event, context, callback) {
  const alexa = Alexa.handler(event, context, callback);
  alexa.registerHandlers(handlers);
  alexa.execute();
};
