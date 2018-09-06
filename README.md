# nodegame-mturk 

An interactive console to handle basic operations with Amazon Mechanical Turk
(MTurk) HITs.

## Purpose

The package is intended to support integration between nodeGame and
Amazon Mechanical Turk services, however, it can be as well used as a
standalone application without nodeGame.

## Config

Create file `conf/mturk.conf.js` using the template in the same
directory. 

Things you need to specify: 

- your Mturk API keys.

Things you might want to specify:

- change the names of the configuration fields to match the names of headers in
your results file (Important! AMT default separator is ;).
- add a filter function to skip items that should not be processed
- add auto-approve 
- add reason for bonus

## Examples

- Start a prompt with a loaded **results file**, and retrieve the last HIT
and last Qualification.
```
$ node ng-amt -r path/to/results/file.csv -H -Q

info: sandbox-mode: on
info: results file: path/to/results/file.csv
info: validation level: 2
info: result codes: 9
info: creating mturk client...
info: done.
info: retrieved QualificationTypeId: XXXXXXXXXXXXXXXXXXX ("My Qualification")
info: retrieved last HIT id: YYYYYYYYYYYYYYYYYYY ("My Task Name")
```
- Show a **summary** of the results.

```
ng-amt~$ show Summary
info: **** Results ****
info: tot results: 9
info: to approve:  7
info: to reject:   2

info: **** Bonus ****
info: bonuses: 7
info: bonuses tot:  29.75
info: bonuses mean: 3.31
info: bonuses std:  0.55
info: bonuses min:  2.39
info: bonuses max:  4.06

info: **** Qualification ****
info: qualifications: 0

info: **** Balance ****
info: Your balance is: $1,000
```

- **Approve/Reject** all results.

```
ng-amt$ uploadResults 
info: tot results: 9
info: to approve:  9
info: to reject:   0

info: results processed: 9/9
info: approved: 7
info: rejected: 2
error: approve/reject failed: 0

info: Original balance: $1,000 New balance: $993 (diff: 7)
```

- **Grant Bonus** with a message to all results.

```
ng-amt$ grantBonus -r "Thank You."
```

- **Assign Qualification** to all results.

```
ng-amt$ assignQualification
```


- **Get HIT Id and Status**

```
ng-amt$ get HITId 
info: retrieved last HIT id: ****************AADIVNV ("Name of the HIT")
ng-amt$ get HITStatus 
info: **** HIT Status **** 
info: id:            ****************AADIVNV
info: status:        NotReviewed
info: pending ass:   0
info: available ass: 49
info: completed ass: 0
info: expiration:    Tue Feb 14 2017 10:38:04 GMT-0500 (EST)
info: annotation:    BatchId:***641;OriginalHitTemplateId:****37243;
```

- **Complete help**

```
ng-amt$ help

  Commands:

    help [command...]               Provides help for a given command.
    exit                            Exits application.
    connect                         
    extendHIT [options]             Extends the HIT.
    expireHIT                       Expires the HIT
    uploadResults [options]         Uploads the results to AMT server (approval+bonus+qualification)
    grantBonus [options]            Grants bonuses as specified in results codes
    assignQualification [options]   Assigns a Qualification to all results codes
    get <what>                      Fetches and stores the requested info
    load [options] <what> <path>    Loads a file
    show [options] <what>           Prints out the requested info
```

## Use programmatically

```
var ngamt = require('nodegame-mturk')( { config: 'path/to/config.js' });
// Connect and fetch last HIT Id (async).
ngamt.api.connect({ getLastHITId: true });
// Expire HIT.
ngamt.modules.manageHIT.expire(function(err) {
   // Do something
});
```

## License

[MIT](LICENSE)
