var fs = require('fs');

var mturk = require('mturk-api');

var _ = require('underscore');

var config = require('./conf/mturk.conf.js');

var HIT_ID = '3K9PHCH9NOW3YE28SFH1HM84OE8GDB';

var HIT_ID = '39O6Z4JLX2BGOQO1EI5S84R8AVLXVG';

var WID = 'A3LK8OUNUF7A9F';
var QID = '38CFB6RWNO92RDB27B7MUL46MWBVKN';

var QID_2 = '3YGUF6UUOTZMHWANF9MHET61IYNXDG';

var UNIQUE_TOKEN = '' + 3000;

mturk.createClient(config).then(function(api) {
    
 
    var params;
    var checkIt;

    checkIt = function(errOrRes) {
        console.log(errOrRes);
        debugger;
    };  
 
//     api.req('GetAccountBalance').then(function(res) {
//         console.log(res.GetAccountBalanceResult);
//         //Do something 
//     }).catch(console.error);


    api
        .req('GetAssignmentsForHIT', {
            HITId: HIT_ID,
            // UniqueRequestToken: UNIQUE_TOKEN
        })
        .then(checkIt)
        .catch(checkIt);
    

//     api
//         .req('ExtendHIT', {
//             HITId: HIT_ID,
//             // MaxAssignmentsIncrement: 10,
//             ExpirationIncrementInSeconds: 300,
//             // UniqueRequestToken: UNIQUE_TOKEN
//         })
//         .then(checkIt)
//         .catch(checkIt);

//      api
//          .req('ForceExpireHIT', { HITId: HIT_ID })
//          .then(checkIt)
//          .catch(checkIt);


//     api
//         .req('GrantBonus',
//              { WorkerId: WID,
//                AssignmentId: '304SM51WA4IV6E2Q5TD7X4BQ5AIBSI', 
//                BonusAmount: {
//                    Amount: 1,
//                    CurrencyCode: 'USD',
//                    // FormattedPrice: 'USD 1'
//                },
//                Reason: 'Good Boy',
//                UniqueRequestToken: '123'
//              })
//         .then(checkIt)
//         .catch(checkIt);

//     params = {
//         Name: 'My Artex',
//         Description: 'You cannot do it twice!',
//         QualificationTypeStatus: 'Active'
//     };
// 
//     api
//         .req('CreateQualificationType', params)
//         .then(checkIt)
//         .catch(checkIt);

//     params = {
//         QualificationTypeId: QID,
//         WorkerId: WID
//     };
//     api.req('AssignQualification', params).then(function(res) {
//         console.log(res);
//         debugger
// 
//     }).catch(function(err) {
//         console.log(err);
//         debugger;       
//     });




//     fs.readFile('./mturklinkpage.html', 'utf8', function(err, unescapedXML) {
//         if (err) {
//             debugger
//             console.error(err);
//             return;
//         }
//         
//         //HIT options 
//         var params = {
//             Title: "Create HIT Example",
//             Description: "An example of how to create a HIT",
//             Question: _.escape(unescapedXML),//IMPORTANT: XML NEEDS TO BE ESCAPED! 
//             AssignmentDurationInSeconds: 180, // Allow 3 minutes to answer 
//             AutoApprovalDelayInSeconds: 86400 * 1, // 1 day auto approve 
//             MaxAssignments: 100, // 100 worker responses 
//             LifetimeInSeconds: 86400 * 3, // Expire in 3 days 
//             Reward: {CurrencyCode:'USD', Amount:0.50}
//         };
//         debugger
//         api.req('CreateHIT', params).then(function(res) {
//             debugger
//             //DO SOMETHING 
//         }).catch(function(err) {
//             debugger
//             console.error(err);
//         });
//         
//     });


    
//     //Example operation, with params 
//     api.req('SearchHITs', { PageSize: 100 }).then(function(res){
//         //Do something 
//     }).catch(console.error)
//         
//         
//         //MTurk limits the velocity of requests. Normally, 
//         //if you exceed their request rate-limit, you will receive a 
//         //'503 Service Unavailable' response. As of v2.0, our interface 
//         //automatically throttles your requests to 3 per second. 
//         for(var i=0; i < 20; i++){
//             //These requests will be queued and executed at a rate of 3 per second 
//             api.req('SearchHITs', { PageNumber: i }).then(function(res){
//                 //Do something 
//             }).catch(console.error);
//         }
    
    
}).catch(console.error);
