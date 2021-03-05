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
        // if (password.length < 8) {
        //     $("#passwordNotValid").slideDown("fast")
        //     return false
        // }

        // Otherwise, return true
        return true
}

$("#changeEmailForm").submit((e) => {
    e.preventDefault()

    $(`#changeAddressBtn`).toggleClass('is-loading')
    $(`#changeAddressBtn`).prop('disabled', true)

    $("#emailNotValid").slideUp("fast")
    $("#badPass").slideUp("fast")
    var newEmail = $("#email").val()
    var password = $("#password").val()

    if (inputValidation(email, password) === true) {
        var payload = {
            sid: Cookie.get("sid"),
            newEmail: newEmail,
            password: password
        }

        socket.emit("REQ:CHANGE_EMAIL", payload)
        $("#emailSentTo").text(email)
    }
})

$("#sendChangePasswordBtn").click(() => {

    $(`#sendChangePasswordBtn`).toggleClass('is-loading')
    $(`#sendChangePasswordBtn`).prop('disabled', true)

    var email = $("#email").val()
    var password = $("#password").val()

    var payload = {
        email: email,
        password: password
    }

    socket.emit("REQ:CHANGE_PASSWORD", payload)
})

socket.on("RES:CHANGE_EMAIL", (data) => {
    // For login pass -----------
    if (data.status === "OK") {
        $("#dashboard-email").hide("slide", { direction: "left" }, 300, () => {
            $("#sentAck").show("slide", { direction: "right" }, 300)
        })
    }
    if (data.reason === "EMAIL_OR_PASSWORD_INCORRECT") {
        $(`#changeAddressBtn`).toggleClass('is-loading')
        $(`#changeAddressBtn`).prop('disabled', false)
        $("#password").val("")
        $("#badPass").slideDown("fast")
    }
})

socket.on("RES:CHANGE_PASSWORD", (data) => {
    // For login pass -----------
    if (data.status === "OK") {
        $("#dashboard-email").hide("slide", { direction: "left" }, 300, () => {
            $("#resetPasswordAck").show("slide", { direction: "right" }, 300)
        })
        Cookies.remove('sid', { path: '/', domain: '.example.com' })
    }
})
