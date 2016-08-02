

  //   $.getJSON( url, function( data ) {
  //     console.log(data);
  //   });
  // return;
  
  function logResults(data) {
  console.log(data);
  }
  
  $.ajax({
  type: 'GET',
  dataType: 'jsonp',
  url: url,
  //       data: {
  //         zipcode: 97201
  //       },
  jsonpCallback: "logResults",
  success: function(result) {
  debugger
  console.log(result);
  },
  error: function(error) {
  debugger
  console.log(error);
  }
  });