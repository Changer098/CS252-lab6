$(document).ready(function(){
	/**
	 * Login button function
	 */
	$("#login").click(function() {
		//Get username and password
		userName = document.getElementById("username_input").value;
		passWord = document.getElementById("password_input").value;
		//Check for blank or null
		if(userName == "" || userName == null || passWord == "" || passWord == null) {
			document.getElementById("loginError").innerHTML = "Please add both a username and a password.";
			$("#loginError").removeClass("invisible");
			document.getElementById("username_input").value = "";
			document.getElementById("password_input").value = "";
		} else { //Send request to server
			//get user from database if exists
			var request = new XMLHttpRequest();
			request.addEventListener("load", function () {
				var recieved = this.responseText;
				var json = JSON.parse(recieved);
				if(request.status === 200) { //200 status = success
					$("#loginmodal").modal("hide");
					document.getElementById("loginButton").style.display = "none";
					document.getElementById("logoutButton").style.display = "block";
					document.getElementById("createButton").style.display = "none";


				} else { //invalid login credentials
					document.getElementById("loginError").innerHTML = "The input combination didn't match.";
					$("#loginError").removeClass("invisible");	
					document.getElementById("username_input").value = "";
					document.getElementById("password_input").value = "";
				}
			});
			request.open("POST", "https://TBD.com/login");
			request.send(JSON.stringify({ "name": userName, "pass": passWord }));
			


			
		}
	});


	/**
	 * Register account button function
	 */
	 
	$("#create").click(function() {
		var u1 = new String($("#u_input").val()).trim();
		var p1 = new String($("#p1_input").val()).trim();
		var p2 = new String($("#p2_input").val()).trim();
		var len = 0;
		//verify password length
		if (u1 == null || u1 == "" || p1 == null || p1 == "" || p2 == null || p2 == "") {
			$("#CreateError").removeClass("invisible");
			document.getElementById("CreateError").innerHTML = "Some fields are missing.";
		} else {
			//there are inputs in all fields
			len = p1.length;
			console.log(len);	
			if(!(p1 === p2)) { //Passwords don't match, stop
				$("#CreateError").removeClass("invisible");
				document.getElementById("CreateError").innerHTML = "Passwords do not match.";
			}
			else if (len > 255 || len < 8) {
				$("#CreateError").removeClass("invisible");
				document.getElementById("CreateError").innerHTML = "Password must be at least 8 characters long.";
			}
			else if (("\"" || '').indexOf(p1) > -1) {
				$("#CreateError").removeClass("invisible");
				document.getElementById("CreateError").innerHTML = "Password cannot contain quotes.";
			} else { //Passwords match, continue
				var user_name = document.getElementById("u_input").value;
				var password = document.getElementById("p1_input").value;
				/*
				var request = new XMLHttpRequest();

				request.addEventListener("load", function () {
					var recieved = this.responseText;
					if(request.status == 200) { //Valid registration, continue
						var json = JSON.parse(recieved);
						storeLoginCookie(json.cookie);

					} else { //Invalid registration, stop
						window.alert("Failed to create account.");
						document.getElementById("userName").value = "";
					}
				});
				request.open("POST", "https://TBD.com");
				request.send(JSON.stringify({	"email": email,
												"pass": password,
												"name": fullName,
												"phone": phoneNumber,
												"username": userName}));
				*/							
				console.log(user_name);
				console.log(password);
				$("#createmodal").modal("hide");
				document.getElementById("loginButton").style.display = "none";
				document.getElementById("logoutButton").style.display = "block";
				document.getElementById("createButton").style.display = "none";

			
			}
		}
	});
});