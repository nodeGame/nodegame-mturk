# nodegame-mturk 

An interactive console to handle basic operations with AMT HITs.

## Purpose

The package is intended to support integration between nodeGame and
Amazon Mechanical Turk services, however, it can be as well used as a
standalone application without nodeGame.

## Config

Create file `conf/mturk.conf.js` using the template in the
same directory. Remember to specify: your Mturk API keys, and any
additional options to correctly load your results file.

## Examples

- Start a prompt with a loaded results file, and retrieve the last HIT
and last Qualification.
```
$ node ng-amt -r path/to/result/file.csv -H -Q

info: sandbox-mode: on
info: results file: path/to/result/file.csv
info: validation level: 2
info: result codes: 9
info: creating mturk client...
info: done.
info: retrieved QualificationTypeId: XXXXXXXXXXXXXXXXXXX ("My Qualification")
info: retrieved last HIT id: YYYYYYYYYYYYYYYYYYY ("My Task Name")
```
- Show a summary of the results.

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

- Approve/Reject all results.

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

- Complete help.

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
