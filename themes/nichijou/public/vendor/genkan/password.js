const socket = io()

// Show password on mousedown on Sign up form
$('#showPassword').on('mousedown taphold', function () {
    $("#password").attr("type", "text")
    $("#password").attr("class", "input is-primary is-active")
    $("#icon-showPassword").addClass("fa-eye")
    $("#icon-showPassword").removeClass("fa-eye-slash")
    $("#showPasswordText").text("Release to hide password")
}).on('mouseup mouseleave taphold', function () {
    $("#password").attr("type", "password")
    $("#password").attr("class", "input")
    $("#icon-showPassword").addClass("fa-eye-slash")
    $("#icon-showPassword").removeClass("fa-eye")
    $("#showPasswordText").text("Hold to show password")
})

// Event listener: Send recovery email Form
$("#recoveryEmailForm").submit((e) => {
    e.preventDefault()

    if ($("#email").val() === "") return

    var payload = {
        email: $("#email").val()
    }

    socket.emit("REQ:RESET_PASSWORD_EMAIL", payload)

    $("#recoveryEmailInput").hide("slide", { direction: "left" }, 300, () => {
        $("#resetPasswordAck").show("slide", { direction: "right" }, 300)
    })
})

$("#resetPasswordForm").submit((e) => {
    e.preventDefault()
    $("#passwordNotValid").slideUp("fast")

    var payload = {
        password: $("#password").val(),
        token: window.location.pathname.split('/')[2]
    }

    if ($("#password").val().length < 8) {
        $("#passwordNotValid").slideDown("fast")
        return
    }

    socket.emit("REQ:RESET_PASSWORD_CHANGE", payload)

    $("#resetPassword").hide("slide", { direction: "left" }, 300, () => {
        $("#passwordResetDone").show("slide", { direction: "right" }, 300)
    })
})

socket.on("RES:RESET_PASSWORD_CHANGE", (data) => {
    if (data.status === true) {
        $("#resetPassword").hide("slide", { direction: "left" }, 300, () => {
            $("#passwordResetDone").show("slide", { direction: "right" }, 300)
        })
    } else {
        window.location.reload()
    }
})