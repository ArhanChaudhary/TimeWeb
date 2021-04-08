/*
This file includes the code for:

Showing and hiding the new assignment form
Form utilities to make inputs more convenient
Upading assignments
Deleting assignments
*/
// Note: submitted assignment transitions for easing in and color are handled in priority.js because that part of the code was more fitting to put there
$(function() {
   function showForm(show_instantly=false) {
        if (show_instantly) {
            $('#overlay').show().children().first().css("top", 15);
        } else {
            $("#overlay").fadeIn(300).children().first().animate({top: 15}, 300);
            if (!isMobile) {
                // Focus on first field
                $("#id_file_sel").focus();
            }
            // Mobile
            $("#image-new-container").blur();
        }
        // Used in utils.js for handling the user typing "N" when showing the form via shift + N
        form_is_showing = true;
        // Make rest of page untabbable
        $(".assignment, .graph, #menu, #image-new-container, a, button:not(#form-wrapper button), .graph-container input").attr("tabindex","-1");
    }
    // Globally define hideForm so it can be used in utils.js
    hideForm = function(hide_instantly=false) {
        if (hide_instantly) {
            $("#overlay").hide().children().first();
            $(".error-note, .invalid").remove(); // Remove all error notes when form is exited
        } else {
            $("#overlay").fadeOut(300,function() {
                // Remove all error notes when form is exited
                $(".invalid").removeClass("invalid");
                $(".error-note").remove();
            }).children().first().animate({top: "0"}, 300);
        }
        // Make rest of page retabbable
        $("a, button:not(#form-wrapper button), .graph-container input").removeAttr("tabindex");
        $("#menu").attr("tabindex","2");
        $("#image-new-container, #user-greeting a").attr("tabindex","1");
        $(".assignment, .graph").attr("tabindex","0");
        // Used in utils.js for handling the user typing "N" when showing the form via shift + N
        form_is_showing = false;
    }
    // Create and show a new form when user clicks new assignment
    $("#image-new-container").click(function() {
        const today = new Date();
        let tomorrow = new Date();
        tomorrow.setDate(today.getDate()+1);
        // Set default values for a new form
        ['',
        
        [
            today.getFullYear(),
            ('0' + (today.getMonth() + 1)).slice(-2),
            ('0' + today.getDate()).slice(-2),
        ].join('-'),

        [
            tomorrow.getFullYear(),
            ('0' + (tomorrow.getMonth() + 1)).slice(-2),
            ('0' + tomorrow.getDate()).slice(-2),
        ].join('-'),

        'Minute','','0','','',def_min_work_time].forEach(function(element, index) {
            $(form_inputs[index]).val(element);
        });
        for (let nwd of Array(7).keys()) {
            $("#id_nwd_"+((nwd+6)%7)).prop("checked",def_nwd.includes(nwd));
        }
        // Set form text
        $("#new-title").html("New Assignment");
        $("#form-wrapper button").html("Create Assignment").val('');
        // Show form
        showForm();
        // replaceUnit is explained later
        replaceUnit();
    });

    // Populate reentered form on modify
    $('.update-button').click(function() {
        // Set form text
        $("#new-title").html("Re-enter Assignment");
        $("#form-wrapper button").html("Modify Assignment");
        // Find which assignment in dat was clicked
        const selected_assignment = dat[$("#assignments-container").children().index($(this).parents(".assignment-container"))];
        // Reented form fields
        const form_data = [
            selected_assignment[0],
            selected_assignment[1],
            selected_assignment[2],
            selected_assignment[3],
            +selected_assignment[4],
            +selected_assignment[5][0],
            +selected_assignment[8],
            selected_assignment[9]-1 ? +selected_assignment[9] : '', // Grouping value displays as self if it isn't 1, else display nothing
            selected_assignment[10]*selected_assignment[8]||'', // Minimum work time displays self if it isn't 0, else display nothing
            // Note: the minimum work time is stored as the original value divided by the completion time per unit, as it is easier to do calculations
            // This multiplies it back to the original value so the user sees the same thing they inputted
        ];
        // Set reeneted form fields
        form_inputs.each((index, element) => $(element).val(form_data[index]));
        selected_assignment[11].forEach(nwd => $("#id_nwd_"+((+nwd+6)%7)).prop("checked",true));
        // Set button pk
        $("#form-wrapper button").val($(this).val());
        // Define old field values
        old_ctime_val = $('#id_ctime').val();
        old_funct_round_val = $('#id_funct_round').val();
        // Show form
        showForm();
        // Replace text accordingly to unit but don't override them with default values
        replaceUnit(false);
    });
    // Hide form when overlay is clicked
    $("#overlay").mousedown(function(e) {
        if (e.target !== this) {
            return
        }
        hideForm();
    });
    // Replace fields with unit when unit is "Minute"
    var old_ctime_val, old_funct_round_val;
    function replaceUnit(replace_field_values=true) {
        const val = $("#id_unit").val().trim();
        const plural = pluralize(val),
            singular = pluralize(val,1);
        if (['second','hour','day','week','month','year'].some(unit_of_time => singular.toLowerCase().includes(unit_of_time))) {
            return alert(`You seem to be entering in "${val}," which is a unit of time. Please enter in "Minute" instead. Although this is not invalid, it's simpler using "Minute"`);
        }
        // Replace fields
        // onlyText is defined at the bottom
        if (val) {
            $("label[for='id_y']").text("Total amount of " + plural + " in this Assignment");
            $("label[for='id_works']").onlyText("Total amount of " + plural + " already Completed");
            $("label[for='id_ctime']").text("Estimated amount of Time to complete each " + singular + " in Minutes");
            $("label[for='id_funct_round']").onlyText("Amount of " + plural + " you will Work at a Time");
        } else {
            $("label[for='id_y']").html("Total amount of Units in this Assignment");
            $("label[for='id_works']").onlyText("Total amount of Units already Completed");
            $("label[for='id_ctime']").html("Estimated amount of Time to complete each Unit of Work in Minutes");
            $("label[for='id_funct_round']").onlyText("Amount of Units you will Work at a Time");
        }
        if (singular.toLowerCase() === 'minute') {
            // Old values for the field when unit==="Minute" and their values are replaced with another
            old_ctime_val = $('#id_ctime').val();
            old_funct_round_val = $('#id_funct_round').val();
            // Replace with new values
            if (replace_field_values) {
                $("#id_funct_round").val(def_minute_gv);
                $("#id_ctime").val("1");
            }
            // Disable field
            $("#id_ctime").prop("disabled",true).addClass("disabled-field");
            $("label[for='id_ctime']").addClass("disabled-field");
        } else {
            if (replace_field_values) {
                // Restore old values and re-enable the field
                $("#id_funct_round").val(old_funct_round_val||'');
                $("#id_ctime").val(old_ctime_val||'');
            }
            $("#id_ctime").prop("disabled",false).removeClass("disabled-field");
            $("label[for='id_ctime']").removeClass("disabled-field");
        }
    }
    $("#id_unit").on('input', replaceUnit);
    // Add info buttons ($.info defined in template.js)
    $('label[for="id_x"], label[for="id_funct_round"], label[for="id_min_work_time"], label#nwd-label-title').append("*");
    $('label[for="id_unit"]').info('right',
        `This is how your assignment will be split and divided up
        
        e.g: If this assignment is reading a book, enter "Page"
        Try changing this name to something else if you're still confused

        If you are unsure how to split up your assignment, this is defaulted to "Minute"`
    );
    $('label[for="id_works"]').info('right',
        `The following is only relevant if you are re-entering this field

        This value is also the y-coordinate of the first point on the blue line, or the initial work input
        
        Changing this initial value will vertically translate all of your other work inputs accordingly`
    );
    $('label[for="id_funct_round"]').info('right',
        `e.g: if you enter 3, you will only work in multiples of 3 (6 units, 9 units, 15 units, etc)
        
        This is useful if your unit is "Minute" as entering a number like 5 will cause you to work in clean multiples of 5 minutes`
    );
    // All form inputs, can't use "#form-wrapper input:visible" because form is initially hidden
    const form_inputs = $("#form-wrapper input:not([type='hidden']):not([name='nwd'])");
    // Auto field scrolling
    form_inputs.focus(function() {
        this.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    });
    // "$(".error-note").length" is the same thing as {% field.errors %} in the template
    if ($(".error-note").length) {
        showForm(true); // Show instantly
        replaceUnit();
    } else {
        hideForm(true); // Hide instantly
    }
    // Custom form validity
    form_inputs.on("input",function() {
        // Reset custom form validity, without this the form invalid error shows up when there is no error
        this.setCustomValidity('');
        // Don't allow "e" in number input
        switch ($(this).attr("id")) {
            case "id_works":
            case "id_y":
            case "id_ctime":
            case "id_funct_round":
            case "id_min_work_time":
                this.validity.valid||($(this).val(''));
                break;
        }
    });
    // Sets custom error message
    form_inputs.on("invalid",function() {
        let message;
        switch ($(this).attr("id")) {
            case "id_file_sel":
                message = 'Please enter an assignment name';
                break;
            case "id_ad":
                message = 'The assignment date is either out of range or invalid';
                break;
            case "id_x":
                if ($(this).val()) {
                    message = 'The due date is either out of range or invalid';
                } else {
                    return; // Allow blank field
                }
                break;
            case "id_unit":
                message = 'Please enter a name';
                break;
            case "id_y":
            case "id_works":
            case "id_ctime":
                message = 'Please enter a value';
                break;
        }
        this.setCustomValidity(message);
    });
    // Redefine old field values when they are changed
    $("#id_ctime").on("input",function() {
        old_ctime_val = $(this).val();
    });
    $("#id_funct_round").on("input",function() {
        old_funct_round_val = $(this).val();
    });
    // Handles unloading and reloading of form
    // lighthouse says to use onpagehide instead of unload
    $(window).on('onpagehide' in self ? 'pagehide' : 'unload',function() {
        if ($("#form-wrapper").is(":visible")) {
            // Save form data to localStorage before unload
            localStorage.setItem("form_fields",
                JSON.stringify([
                    ...form_inputs.toArray().map(field => field.value),
                    $("#form-wrapper #nwd-wrapper input").toArray().map(nwd_field => nwd_field.checked),
                ])
            );
        }
    });
    if ("form_fields" in localStorage) {
        
        // Restore form on refresh or invalid
        const pr_data = JSON.parse(localStorage.getItem("form_fields"));
        localStorage.removeItem('form_fields');
        form_inputs.each(function(index) {
            $(this).val(pr_data[index]);
        });
        $("#form-wrapper #nwd-wrapper input").each(function(index) {
            $(this).prop('checked',pr_data[9][index]);
        });
        // Define old field values if unit === "Minute"
        old_ctime_val = $('#id_ctime').val();
        old_funct_round_val = $('#id_funct_round').val();
    }
    if ("scroll" in localStorage) {
        $(window).on('load', function() {
            $("main").scrollTop(localStorage.getItem("scroll"));
            localStorage.removeItem("scroll");
        });
    }
    // Form submission
    $("#form-wrapper form").submit(function() {
        // Enable disabled field on submit so it's sent with post
        $("#id_ctime").removeAttr("disabled");
        // Save scroll when post loads to make it seamless
        localStorage.setItem("scroll",$("main").scrollTop());
        // Prevent submit button spam clicking
        $("#form-wrapper button").css("pointer-events", "none");
    });
    // Style errors if form is invalid
    $("#form-wrapper .error-note").each(function() {
        $(this).prev().children().eq(1).addClass("invalid");
        if (this.id === "error_id_x" || this.id === "error_id_works") {
            $(this).prev().prev().children().eq(1).addClass("invalid");
        }
    });
    // Focus on first invalid field
    $("#form-wrapper .error-note").first().prev().children().eq(1).focus();
    // Delete assignment
    $('.delete-button').click(function() {
        const $this = $(this),
            assignment_container = $this.parents(".assignment-container");
        if (confirm(isMobile ? 'Are you sure you want to delete this assignment?' : 'Are you sure you want to delete this assignment? (Press Enter)')) {
            // Unfocus to prevent pressing enter to click again
            $this.blur();
            new Promise(function(resolve) {
                // Scroll to assignment before it is deleted if out of view
                setTimeout(function() {
                    // Sometimes doesn't scroll without setTimeout
                    assignment_container[0].scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                    });
                }, 0);
                // The scroll function determines when the page has stopped scrolling and internally resolves the promise via "resolver"
                resolver = resolve;
                $("main").scroll(scroll);
                scroll();
            }).then(function() {
                // Deny updating or deleting again after queued
                assignment_container.css("pointer-events", "none");
                $(document).queue(function() {
                    // Once the assignment, is done, this sends the data to the backend and animates its deletion
                    let data = {
                        'csrfmiddlewaretoken': csrf_token,
                        'deleted': $this.val(), // Primary key value
                    }
                    const success = function() {
                        const assignment = assignment_container.children().first();
                        new Promise(function(resolve) {
                            if (assignment.hasClass("disable-hover")) {
                                ignore_queue = true;
                                assignment.click().find(".graph-container").one("transitionend", resolve);
                                ignore_queue = false;
                            } else {
                                resolve();
                            }
                        }).then(function() {
                            // Opacity CSS transition
                            assignment.css("opacity", "0");
                            // Animate height
                            assignment_container.animate({marginBottom: -assignment_container.height()-10}, 750, "easeOutCubic", function() {
                                // Remove assignment data from dat
                                dat.splice($("#assignments-container").children().index(assignment_container),1);
                                // Remove from DOM
                                assignment_container.remove();
                                // Dequeue it
                                $(document).dequeue();
                            });
                        });
                    }
                    // Send ajax to avoid a page reload
                    $.ajax({
                        type: "POST",
                        data: data,
                        success: success,
                        error: function(response, exception) {
                            // If ajax failed, allow updating or deleting again
                            assignment_container.css("pointer-events", "auto");
                            error(response, exception);
                        }
                    });
                });
            });
        }
    });
});
// Only change text of form label
(function($) {
    $.fn.onlyText = function(text) {
        this[0].firstChild.nodeValue = text
        return $(this);
    };
}(jQuery));