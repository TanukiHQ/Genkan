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
})