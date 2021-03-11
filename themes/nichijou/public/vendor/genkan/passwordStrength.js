// Show password on mousedown on Sign up form
$('#showPassword').on('mousedown taphold', function () {
    $("#registerPassword").attr("type", "text")
    $("#registerPassword").attr("class", "input is-primary is-active")
    $("#icon-showPassword").addClass("fa-eye")
    $("#icon-showPassword").removeClass("fa-eye-slash")
    $("#showPasswordText").text("Release to hide password")
}).on('mouseup mouseleave taphold', function () {
    $("#registerPassword").attr("type", "password")
    $("#registerPassword").attr("class", "input")
    $("#icon-showPassword").addClass("fa-eye-slash")
    $("#icon-showPassword").removeClass("fa-eye")
    $("#showPasswordText").text("Hold to show password")
})

ValidatePassword = () => {
    var str = $('#newPassword').val(); 
    console.log(str);

    console.log(str.search(/[0-9]/))
    if (str.length <= 0) {
        $("#passwordMessage").css("visibility", "visible");
        $("#passwordMessage").text("Password length must be at least 8 characters");
        $("#passwordMessage").addClass("is-danger");
    }
    else if (str.search(/[A-Z]/) == -1) {
        $("#passwordMessage").css("visibility", "visible");
        $("#passwordMessage").text("Password must contain at least 1 uppercase letter");
        $("#passwordMessage").addClass("is-danger");
    }
    else if (str.search(/[a-z]/) == -1) {
        $("#passwordMessage").css("visibility", "visible");
        $("#passwordMessage").text("Password must contain at least 1 lowercase letter");
        $("#passwordMessage").addClass("is-danger");
    }
    else if (str.search(/[0-9]/) == -1) {
        $("#passwordMessage").css("visibility", "visible");
        $("#passwordMessage").text("Password must contain at least 1 number");
        $("#passwordMessage").addClass("is-danger");
    }
    else if (str.search(/[$&+,:;=?@#|'<>.^*()%!-]/) == -1) {
        $("#passwordMessage").css("visibility", "visible");
        $("#passwordMessage").text("Password must contain at least 1 special character");
        $("#passwordMessage").addClass("is-danger");
    }
    else {
        $("#passwordMessage").css("visibility", "visible");
        $("#passwordMessage").text("Looks Good!");
        $("#passwordMessage").removeClass("is-danger");
        $("#passwordMessage").addClass("is-success");
    }
    //If want to add another password field
    //Uncomment codes below and modify it
    //else {
    //    if (str != str2) {
    //        document.getElementById('<%=firstPasswordError.ClientID%>').innerHTML = "Excellent";
    //        document.getElementById('<%=firstPasswordError.ClientID%>').style.color = "Green";
    //        document.getElementById('<%=secondPasswordError.ClientID%>').innerHTML = "Ensure that both passwords are the same";
    //        document.getElementById('<%=secondPasswordError.ClientID%>').style.color = "Red";
    //        document.getElementById('<%=submitBtn.ClientID%>').disabled = true;
    //    }
    //    else {
    //        document.getElementById('<%=firstPasswordError.ClientID%>').innerHTML = "Excellent";
    //        document.getElementById('<%=firstPasswordError.ClientID%>').style.color = "Green";
    //        document.getElementById('<%=secondPasswordError.ClientID%>').innerHTML = "Excellent";
    //        document.getElementById('<%=secondPasswordError.ClientID%>').style.color = "Green";
    //        document.getElementById('<%=submitBtn.ClientID%>').disabled = false;
    //    }
    //}
}