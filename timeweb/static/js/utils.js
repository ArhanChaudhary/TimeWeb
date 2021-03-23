/* 
This file includes the code for:

Starting animation
Keybinds
Setting assignment width on resize
Ajax error function
Other minor utilities
*/
$(function() {
    // Do starting animation
    if (!("animation-ran" in sessionStorage)) {
        // If the animation has not already been run, add the class "animate" to the elements that will be animated
        // The animation will happen instantly, because the transitions are only applied to :not(.animate)
        // Then, when the window loads, remove ".animate". This will cause the actual transition
        $("#content, #header, #assignments-container").addClass("animate");
        // Animation has ran
        sessionStorage.setItem("animation-ran", true);
        // Use "$(window).load(function() {"" of "$(function) { "instead because "$(function() {" fires too early
        $(window).load(() => $("#content, #header, #assignments-container").removeClass("animate"));
    }
    // Keybinds
    $(document).keydown(function(e) {
        if (e.shiftKey /* Needed if the user presses caps lock */ && e.key === 'N') {
            $("#image-new-container").click();
        } else if (e.key === "Escape") {
            hideForm();
        }
    });
    // width * percent = width+10
    // percent = 1 + 10/width
    $(window).resize(function() {
        $("#assignments-container")[0].style.setProperty('--scale-percent',`${1 + 10/$(document.querySelector(".assignment")).width()}`);
    });
    $("#assignments-container")[0].style.setProperty('--scale-percent',`${1 + 10/$(document.querySelector(".assignment")).width()}`);
    // Ajax error function
    error = function(response, exception) {
        if (response.status == 0) {
            alert('Failed to connect');
        } else if (response.status == 404) {
            alert('Page not found, try again');
        } else if (response.status == 500) {
            alert('Internal server error. Please contact me if you see this')
        } else if (exception === 'parsererror') {
            alert('Requested JSON parse failed');
        } else if (exception === 'timeout') {
            alert('Timeout error');
        } else if (exception === 'abort') {
            alert('Request aborted');
        } else {
            document.write(response.responseText);
        }
    }
    // Hide and show estimated completion time
    $("#hide-button").click(function() {
        if ($(this).html() === "Hide") {
            $(this).html("Show").prev().toggle();
            localStorage.setItem("hide-button",true);
        } else {
            $(this).html("Hide").prev().toggle();
            localStorage.removeItem("hide-button");
        }
    });
    if ("hide-button" in localStorage) {
        $("#hide-button").html("Show").prev().toggle();
    }
});