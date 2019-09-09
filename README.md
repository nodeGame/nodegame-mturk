# nodegame-mturk

Handles operations with Amazon Mechanical Turk (MTurk), such as approve/reject
HITS, grant bonuses, assign qualifications, etc.

## Decription

It can be used as an interactive console or can be called programmatically.

As an interactive console, it can operate in two modes:

- **standalone mode**: import a compatible results file from MTurk;
- **nodeGame mode**: automatically scan the data folder of a nodeGame game
  and import all results files found.

## Installation

- **Stable**:

```
npm install nodegame-mturk
```

- **Development**:

```
git clone https://github.com/nodeGame/nodegame-mturk.git
cd nodegame-mturk
npm install
```

## Configuration

Create file `conf/mturk.conf.js` using the template in the same
directory.

Add your Amazon Web Service (AWS) Keys in the conf file:

- **accessKeyId**: 'XXX',

- **secretAccessKey**: 'YYY'

If you do not have your keys yet, please read
[here](https://aws.amazon.com/kms/).

### Optional Configuration Settings

- **region**: the AWS server you want to connect to. Default: 'us-east-1'.

- **nodeGamePath**: the absolute path, or relative path from the root folder of
the nodegame-mturk directory, to a nodeGame installation directory. Needed only
if you want to automatically import results files from nodeGame.

- **fields**: object specifiying the names of the fields for
non-standard results files (Important! MTurk default separator is ;).

- **filter**: a function to filter items before importing them: must
  return falsy to skip them or truthy to keep them. Default: items are
  skipped if `type` is equal to 'bot' or if 'skip' is truthy.

- **autoApprove**: A boolean flag specifying to auto-approve all
imported assignments. Default: false.

- **maxBonus**: maximum bonus payable, an error will be raised
    otherwise. Default: 10USD.

- **minBonus**: minimum bonus payable, an error will be raised
    otherwise. Default: 0USD.

- **autoApprove**: A boolean flag specifying to auto-approve all
imported assignments. Default: false.

- **sandbox**: Operates in sandbox mode. Default: false

More options available directly in the configuration file.

## Usage

### Launch the program

Start the program from the command line:

    node ng-amt.js

These are the main inline options to use when you start the program
(the short and long form of each command are equivalent).

  **-c, --connect**: Opens the connection with MTurk Server

  **-r, --resultsFile <resultsFile>**: Path to a results file with Exit and Access Codes

  **-g, --game <gameFolder> [minRoom-maxRoom]**: Path to a nodeGame game and optional room boundaries

  **-Q, --getQualificationTypeId**: Fetches the last qualification type owned by requester

  **-H, --getLastHITId**: Fetches the id of the latest HIT

  **-s, --sandbox**: Activate sandbox mode

  **-h, --help**: Output usage information

#### Other inline options

  **-C, --config <confFile>**: Specifies a configuration file

  **-i, --inputCodesFile <inputCodesFile>**: Path to a codes file with Exit and Access Codes

  **-t, --token [token]**: Unique token for one-time operations

  **-d, --dry**: Dry-run: does not actually send any request to server

  **-n, --nRetries <nRetries>**: How many times a request is repeated in case of error (Def: 0)

  **-l, --retryInterval <rInterval>**: Milliseconds to wait before a request is repeated (Def: 10000)

  **-o, --throttleInterval <tInterval>**: Milliseconds between two consecutive requests (Def: 500)

  **-q, --quiet**: No/minimal output printed to console

### Interactive Prompt

After the you started the program, you have access to the interactive
console with the following commands:

**connect**:                         Creates the AWS client.

**uploadResults [options]**:         Uploads the results to AMT server (approval+bonus+qualification).

**grantBonus [options]**:            Grants bonuses as specified in results codes.

**assignQualification [options]**:   Assigns a Qualification to all results codes.

**get <what>**:                      Fetches and stores the requested info.

**load [options] <what> <path>**:    Loads a file.

**show [options] <what>**:           Prints out the requested info.

**extendHIT [options]**:             Extends the HIT.

**expireHIT**:                       Expires the HIT.

**help [command...]**:               Provides help for a given command.

**exit**:                            Exits application.

Use TAB to autocomplete commands and options.


## Examples

- **Start the program with initial options**

Here we load a results file,  retrieve the last HIT Id and last
Qualification Id.

```bash
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
- **Show a summary**

```bash
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

- **Approve/Reject results**

```bash
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

- **Grant a Bonus**

```bash
ng-amt$ grantBonus -r "Thank You"
```

The reason (option -r) is required.

- **Assign a Qualification**

```bash
ng-amt$ assignQualification -i 1
```

The option -i is required. It assigns an integer value for the
qualification. Any positive value can be specified. You can use
different values to differentiate between participants with the same
qualifications.

- **Get HIT Id**

```bash
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

The command above returns the last created HIT. If your HIT is not the
last one, you can search through the list of 10 most recent HITs.

```bash
ng-amt$ get HITIdList
? Select a HIT
  1) 7/20/2019 - ***********************YYNG27N Label Tweets ($1.00)
  2) 7/20/2019 - ***********************JS8T6I3 Ultimatum Game ($1.00)
  3) 7/19/2019 - ***********************UC8RXR8 Prisoner Dilemma ($3.00)
  4) 7/18/2019 - ***********************0IBHN5N Understanding Others ($0.85)
  5) 7/12/2019 - ***********************Z82S7GA Tell a joke ($0.25)
  6) 7/11/2019 - ***********************FCXM1KN Estimating product preferences ($1.00)
(Move up and down to reveal more choices)
  Answer:
```

- **Get Qualification Id**

```bash
ng-amt$ get QualificationTypeId
info: set QualificationTypeId: ***************WZ8QQ6QO ("my_qualification")
```

The command above returns the last qualification. You can search through the
list of the 10 most recent Qualifications.

```bash
ng-amt$ get QualificationTypeIdList 
? Select a QualificationType 
  1) 4/20/2019 my_qualification
  2) 11/20/2018 another_qualification
  3) 8/7/2018 what_is_this_for
  4) 7/4/2018 you_made_it
  5) 6/4/2018 you_are_definitely_qualified
  6) 6/3/2018 you_are_unqualifiable
(Move up and down to reveal more choices)
  Answer: 
```bash

If you still do not find it, you can add a search query.

```
ng-amt$ get QualificationTypeIdList -s Finished
? Select a QualificationType 
  1) 7/21/2017 Finished_my_study
  Answer: 
```

- **Get the Status of a running HIT**

```bash
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

- **Load all results from nodeGame**

```bash
ng-amt$ load Game mygame -l 60-61

info: loading rooms of game mygame
info: scanning data folder minRoom=60 maxRoom=61
warn: no results in room room000060
info: loading results file: room000061
info: results file: C:\Users\me\nodegame-v5.0.0-dev\games\mygame\data\room000061\bonus.csv
info: result codes: 1
```

The commands looks for files saved as `bonus.csv`, `results.csv`, or
`codes.csv` in each directory and loads them.

## Use programmatically

```javascript
// Require ngmt.
var ngmt = require('nodegame-mturk')();
// Or with a custom config file
// var ngmt = require('nodegame-mturk')({ config: 'path/to/config.js'
});

// Connect, fetch last HIT Id (async), and then assign it to a worker.

ngmt.api.connect({ getLastHITId: true }, function() {
    ngmt.modules.qualification.assign({
        WorkerId: XXXXXXXXX',
        QualificationTypeId: ngmt.config.qualificationId,
        IntegerValue: 1
    });
});
```

## License

[MIT](LICENSE)
