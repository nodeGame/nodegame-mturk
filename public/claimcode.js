$(document).ready(function() {
    var wid, aid, hid;
    var host;

    function encrypt(o) {
        var i, len;
        if ('undefined' === typeof JSON) {
            alert('Your browser does not support this HIT');
            return;
        }
        return btoa(JSON.stringify(o));
    }

    function displayLink(code) {
        var link, url;
        url = host + 'auth/' + code;
        link = document.getElementById('game-link');
        link.href = url;
        link.innerHTML = url;
        link.style.display = '';
        document.getElementById('loading-code').style.display = 'none';
    }

    function showError(err) {
        var el;
        document.getElementById('loading-code').style.display = 'none';
        el = document.getElementById('before-accept');
        el.innerHTML = 'An error occurred generating the code: ' + err;
        el.style.display = '';
    }

    function getId() {
        // TODO: add this in the body if you want to add codes
        // <input type="hidden" name="id" id="id" value="${id}">
        return document.getElementById('id').value;
    }

    function claimId() {
        document.getElementById('before-accept').style.display = 'none';
        document.getElementById('loading-code').style.display = '';
        // Add trailing slash.
        if (host.charAt(host.length) !== '/') host += '/';
        $.ajax({
            dataType: 'jsonp',
            url: host + 'claimid/',
            data: { h: hid, id: wid, a: aid },
            crossDomain: true,
            success: function(result) {
                debugger
                displayLink(result.code);
            },
            error: function(error) {
                debugger
                showError(error);
            }
        });
    }

    host = 'https://a-e-g.herokuapp.com';

    // Get parameters (must be on Mturk).
    if ('function' !== typeof turkGetParam) return;
    
    wid = turkGetParam('workerId');
    // If there is no worker id, the turker has not yet accepted the HIT.
    if ('undefined' === typeof wid) return;
    aid = turkGetParam('assignmentId');
    hid = turkGetParam('hitId');

    //      host = 'http://localhost:8080';
    //      wid = 30;
    //      aid = 2;
    //      hid = 1;

    claimId();

});
