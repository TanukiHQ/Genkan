const socket = io()

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

// Validate Inputs
const inputValidation = (email, password) => {
    // Check if empty
    if (email === "" || password === "") return false

    // Regex check on email address
    if (/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email) === false) {
        $("#emailNotValid").slideDown("fast")
        return false
    } else 

    // Check password length
    if (password.length < 8) {
        $("#passwordNotValid").slideDown("fast")
        return false
    }

    // Otherwise, return true
    return true
}

// Event listener: Sign up Form
$("#signupForm").submit((e) => {
    e.preventDefault()

    $(`#registerButton`).toggleClass('is-loading')
    $(`#registerButton`).prop('disabled', true)
    
    $("#emailNotValid").slideUp("fast")
    $("#passwordNotValid").slideUp("fast")
    $("#emailDuplicate").slideUp("fast")
    var email = $("#registerEmail").val()
    var password = $("#registerPassword").val()

    if (inputValidation(email, password) === true) {
        var payload = {
            email: email,
            password: password
        }

        socket.emit("REQ:REGISTER", payload)
        $("#emailSentTo").text(email)
    }
})

// Event listener: Login Form
$("#loginForm").submit((e) => {
    e.preventDefault()
    
    $(`#loginButton`).toggleClass('is-loading')
    $(`#loginButton`).prop('disabled', true)
    $("#emailConfirmed").slideUp("fast")
    $("#badLogin").slideUp("fast")
    var email = $("#loginEmail").val()
    var password = $("#loginPassword").val()

    if (email === "" || password === "") return false

    var payload = {
        email: email,
        password: password
    }

    socket.emit("REQ:LOGIN", payload)
    $("#emailSentTo").text(email)
})

// Event listener: Resend Email Button
$("#resendEmailButton").click(() => {
    var email = $("#loginEmail").val()
    var password = $("#loginPassword").val()

    var payload = {
        email: email,
        password: password
    }

    $(`#resendEmailButton`).prop('disabled', true);
    socket.emit("REQ:RESEND_CONFIRMATION_EMAIL", payload)
})

// Socket.io: To send confirmation email
socket.on("RES:RESEND_CONFIRMATION_EMAIL", (data) => {
    // For resend failures (Sending too fast) -----------
    if (data.status === "FAILED") {
        $("#tooFastEmail").slideDown("fast")
    }
})

// Socket.io: To register account
socket.on("RES:REGISTER", (data) => {
    // For register pass -----------
    if (data.status === "OK") {
        $("#register").hide("slide", { direction: "left" }, 300, () => {
            $("#emailConfirmation").fadeIn("fast")
        })

    }
    // For register failures -----------
    if (data.reason === "EMAIL_EXISTS") {
        $(`#registerButton`).toggleClass('is-loading')
        $(`#registerButton`).prop('disabled', false)
        $("#emailDuplicate").slideDown("fast")
    }
})

// Socket.io: To login account
socket.on("RES:LOGIN", (data) => {
    // For login pass -----------
    if (data.status === "OK") {
        $("#login").hide("slide", { direction: "left" }, 300, () => {
            $("#authorised").show("slide", { direction: "right" }, 300, () => {
                // Set cookie
                Cookies.set('sid', data.sid, { expires: 42, path: '', domain: ".", secure: true, sameSite: 'strict' }) // Configuration required

                // Redirect
                setTimeout(() => {
                    window.location.replace(data.route)
                }, 2500)
            })
        })
    }

    // For login failures -----------
    if (data.reason === "EMAIL_NOT_CONFIRMED") {
        $("#login").hide("slide", { direction: "left" }, 300, () => {
            $("#emailConfirmation").show("slide", { direction: "right" }, 300)
        })
    }
    if (data.reason === "EMAIL_OR_PASSWORD_INCORRECT") {
        $(`#loginButton`).toggleClass('is-loading')
        $(`#loginButton`).prop('disabled', false)
        $("#loginPassword").val("")
        $("#badLogin").slideDown("fast")
    }
    if (data.reason === "ACCOUNT_SUSPENDED") {
        $("#login").hide("slide", { direction: "left" }, 300, () => {
            $("#accountSuspended").show("slide", { direction: "right" }, 300)
        })
    }
})
