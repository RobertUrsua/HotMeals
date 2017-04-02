var warmMeal = angular.module('warmMeal', ['ngRoute']);


warmMeal.config(['$routeProvider', function($routeProvider){
	$routeProvider
	.when('/',{
		templateUrl: 'views/splash.html'
	})
	.when('/map',{
		templateUrl: 'views/map.html',
		controller: 'mapController'
	})
	.when('/signup',{
		templateUrl: 'views/signup.html',
		controller: 'signUpController'
	})
	.when('/noavailablemeal',{
		templateUrl: 'views/nextMealAvailability.html',
		controller: 'availableController'
	})
	.when('/login',{
		templateUrl: 'views/login.html',
		controller: 'loginController'
	})
	.otherwise({
		redirectTo: '/'
	});

}]);

// WarmMeal.run(function(){
// 	//fires at run-time
// });

warmMeal.controller('warmMealController', function($scope){
	$scope.message = 'test';
});

warmMeal.controller('availableController', function($scope){
	$scope.time = "11:59 PM";
	$scope.date = "Tomorrow";
});

warmMeal.controller('signUpController', function($scope){
	$scope.name = "";
	$scope.lastName = "";
	$scope.email = "";
	$scope.password = "";
	$scope.confirmPassword = "";

	function hasValidEntries(){
		if(!$scope.name) {
			alert('First Name cannot be blank.');
			return false;
		} else if (!$scope.lastName) {
			// All the variables are not empty and have the same correct password
			alert('Last Name cannot be blank.');
			return false;
		} else if (!$scope.email) {
			alert('Email cannot be blank.');
			return false;
		} else if(!$scope.password) {
			alert('Password cannot be blank.');
			return false;
		} else if(!$scope.confirmPassword) {
			alert('Password cannot be blank.');
			return false;
		} else if (!hasValidPassword()) {
			return false;
		}
		return true;
	}

	// Password must equal the confirm password and be more than 6 characters
	function hasValidPassword() {
		// TODO: Notify user that their passwords didn't match. 
		if ($scope.password.length >=8 && $scope.password === $scope.confirmPassword) {
			return true
		}
		alert('The passwords must be at least 8 characters and match.')
		return false
	}

	function writeUserData(userId) {
		// Setting the date for the lastClaimedCode to be 1 day earlier than the current time because firebase won't allow null entries.
		// This allows new users to be able to get a Hot Meal right away without us having to set the date to null initially.
		var initialDate = new Date();
		initialDate.setDate(initialDate.getDate()-1);
		// var userId = firebase.auth().uid

		var database = firebase.database();
		console.log("DATABASE = " + database);
		console.log("userid = " + userId);
		firebase.database().ref('users/' + userId).set({
			firstName: $scope.name,
			lastName: $scope.lastName,
			email: $scope.email,
			isBanned: false,
			lastClaimedCode: initialDate
		    // TODO: Send in photo url obtained from the camera once we integrate it with the signup process.
		    // photoID: imageUrl
		});
	}
	function createAccount() {
		var initialDate = new Date();
		initialDate.setDate(initialDate.getDate()-1);
		var user = firebase.auth().createUserWithEmailAndPassword($scope.email, $scope.password).catch(function(error) {
				// Handle Errors here.
		 		var errorCode = error.code;
				var errorMessage = error.message;
				console.log("error creating user: " + errorMessage);

				if (errorCode == 'auth/weak-password') {
					alert('The password is too weak.');
				} else {
					alert(errorMessage);
				}			
			});
		// return user;
	}

	$scope.submit = function(){
		console.log("check");
		if (hasValidEntries()) {
			//Create a new user in Firebase
			console.log("about to create account");
			createAccount();
			firebase.auth().onAuthStateChanged(function(user) {
				if (user) {
					console.log("THERE'S A USER");
				    // See if user exists in database
				    var userInfo = firebase.database().ref('users').child(user.uid);
				    console.log("userInfo = " + userInfo);
				    writeUserData(user.uid);				    
				}
			});
			// TODO: Goto the homepage.
		}
	};
});

warmMeal.controller('loginController', function($scope){
	$scope.email = "";
	$scope.password = "";

	$scope.login = function(){
		//TODO: Verify through facial recognition and then go to new page
		console.log("login pressed");
		var user = firebaseSignIn();
	};

	function firebaseSignIn() {
		var user = firebase.auth().signInWithEmailAndPassword($scope.email, $scope.password).catch(function(error) {
		  // Handle Errors here.
		  var errorMessage = error.message;
		  console.log("error logging in user: " + errorMessage);
		  alert(errorMessage);
		});
		console.log("user = " + user);
		return user;
	}	
});

warmMeal.controller('mapController', function($scope){
	// Taking care of search bar 


	$("#foodpref-text-form")
	.focus(function() {
		if (this.value === this.defaultValue) {
			this.value = '';
		}
	})
	.blur(function() {
		if (this.value === '') {
			this.value = this.defaultValue;
		}
	});

// Taking care of google map

//default values
var currentQuery = "restaurants";
var currentSearchRadius = "1000";	


var map;
var myLocation =  {lat: 34.069845, lng: -118.246329};

var addedMarkers = [];

var fpbutton = document.getElementById("foodpref-button");
fpbutton.addEventListener("click", function(){
	currentQuery = document.getElementById("foodpref-text-form").value + " restaurants";
	myLocation = map.getCenter();	
	findRestaurants();
})


function initMap() {

	console.log("check");
	// Options for the google map that will be displayed
	// Center should correspond to the users' current location
	var mapOptions = {
		center: myLocation,
		zoom: 15,
		mapTypeControl: false,
		streetViewControl: false,
		rotateControl: false	
	};		

	// Create the base map that will be displayeds
	map = new google.maps.Map(document.getElementById('restoMap'), mapOptions);

	findRestaurants();

}

function findRestaurants(){


	for(var i=0;i<addedMarkers.length;i++){
		addedMarkers[i].setMap(null);
	}	
	addedMarkers = [];

   	// Request JSON for for using the Google Places API
   	// the api will be used to retrieve restaurants within 1000m of the user's location
   	var request = {
   		location: map.getCenter(),
   		radius: currentSearchRadius,
   		query: currentQuery
   	};

	// Send the request and call the addRestaurantMarkers
	// to include the restaurants on the map being shows
	var googPlaceService = new google.maps.places.PlacesService(map);
	googPlaceService.textSearch(request, addRestaurantMarkers);
}


function addRestaurantMarkers(results, status) {
	// If request was successful
	if (status == google.maps.places.PlacesServiceStatus.OK) {

		// Iterate through ALL restaurants, add their markers, and add the popup info for each marker
		for (var i = 0; i < results.length; i++) {
			var place = results[i];

			// adds the marker to the map at a specified location
			var newMarker = new google.maps.Marker({
				position: results[i].geometry.location,
				map: map
			});		

			// place holder variable for information about how many means a restaurant can provide
			var mealCountInfo = Math.floor(Math.random()*10);

			// place holder variable for type of food that a restaurant will provid
			// var foodType = "Vegan, Vegetarian, Gluten-Free, Organic";
			// <div class=&quot;riw-row&quot;><span class=&quot;riw-title&quot;> Food: </span>  	<span class=&quot;riw-data&quot;>" + foodType + "</span> </div> 

			// Creates the info window aka popup
			var newInfoWindow = new google.maps.InfoWindow({
				content: 
				"<div class=&quot;resto-info-window&quot;><div class=&quot;riw-row&quot;><span class=&quot;riw-title&quot;> " +  results[i].name + "  </span>	<span class=&quot;riw-data&quot;></span></div><div class=&quot;riw-row&quot;> <span class=&quot;riw-title&quot;> Meal Count: </span><span class=&quot;riw-data&quot;> " + mealCountInfo + " </span>  </div> </div>"
			});


			// Adds the popup event listener
			newMarker.addListener('mouseover', addPopupEvListOpen(map, newMarker, newInfoWindow));
			newMarker.addListener('mouseout', addPopupEvListClose(map, newMarker, newInfoWindow));
			addedMarkers.push(newMarker);
		}
	}
}

function addPopupEvListOpen(map, marker, newInfoWindow){
	return function(){
		newInfoWindow.open(map, marker);
	};
}

function addPopupEvListClose(map, marker, newInfoWindow){
	return function(){
		newInfoWindow.close(map, marker);
	};
}
});
