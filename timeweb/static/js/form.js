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
            $('#overlay').show().addClass("transition-form");
        } else {
            $("#overlay").fadeIn(300).addClass("transition-form");
        }
        // Make rest of page untabbable
        $(".assignment, .graph, #menu, #image-new-container, a, button:not(#form-wrapper button), .graph-container input").attr("tabindex","-1");
        $('#id_works').val((+$('#id_works').val()).toFixed(2)); // Ensure #id_works has two decimal places because 0 displays as 0.0
    }
    function hideForm(hide_instantly=false) {
        if (hide_instantly) {
            $("#overlay").hide().removeClass("transition-form");
            $(".error-note, .invalid").remove(); // Remove all error notes when form is exited
        } else {
            $("#overlay").fadeOut(300,function() {
                $(".invalid").removeClass("invalid");
                $(".error-note").remove();
            }).removeClass("transition-form"); // Remove all error notes when form is exited
        }
        // Make rest of page retabbable
        $("a, button:not(#form-wrapper button), .graph-container input").removeAttr("tabindex");
        $("#menu").attr("tabindex","2");
        $("#image-new-container, #user-greeting a").attr("tabindex","1");
        $(".assignment, .graph").attr("tabindex","0");
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

        'Minute','','0.00','','',def_min_work_time].forEach(function(element, index) {
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
        // Define reented form fields, could have been written more efficient but it's more readable like this
        const form_data = [
            selected_assignment[0],
            selected_assignment[1],
            selected_assignment[2],
            selected_assignment[3],
            selected_assignment[4],
            selected_assignment[5][0],
            selected_assignment[8],
            selected_assignment[9]-1 ? selected_assignment[9] : '', // Grouping value displays as self if it isn't 1, else display nothing
            +selected_assignment[10] ? (selected_assignment[10]*selected_assignment[8]).toFixed(2) : '', // Minimum work time displays self if it isn't 0, else display nothing
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
    function replaceUnit() {
        const val = $("#id_unit").val();
        const plural = pluralize(val),
            singular = pluralize(val,1);
        // Replace fields
        if (val) {
            $("label[for='id_y']").text("Enter the Total amount of " + plural + " in this Assignment");
            $("label[for='id_works']").text("Enter the Total amount of " + plural + " already Completed");
            $("label[for='id_ctime']").text("Enter the Estimated amount of Time to complete each " + singular + " in Minutes");
        } else {
            $("label[for='id_y']").html("Enter the Total amount of Units in this Assignment");
            $("label[for='id_works']").html("Enter the Total amount of Units already Completed");
            $("label[for='id_ctime']").html("Enter the Estimated amount of Time to complete each Unit of Work in Minutes");
        }
        if (singular.toUpperCase() === 'MINUTE') {
            // Old values for the field when unit==="Minute" and their values are replaced with another
            old_ctime_val = $('#id_ctime').val();
            old_funct_round_val = $('#id_funct_round').val();
            // Replace with new values
            $("#id_funct_round").val(def_minute_gv);
            $("#id_ctime").val("1.00")
            // Disable field
            .prop("disabled",true).addClass("disabled-field");
            $("label[for='id_ctime']").addClass("disabled-field");
        } else {
            // Restore old values and re-enable the field
            $("#id_funct_round").val(old_funct_round_val ? (+old_funct_round_val).toFixed(2) : '');
            $("#id_ctime").val(old_ctime_val ? (+old_ctime_val).toFixed(2) : '').prop("disabled",false).removeClass("disabled-field");
            $("label[for='id_ctime']").removeClass("disabled-field");
        }
    }
    $("#id_unit").on('input',replaceUnit);

    // Add info buttons ($.info defined in template.js)
    $('label[for="id_x"], label[for="id_funct_round"], label[for="id_min_work_time"], label#nwd-label-title').append("*");
    $('label[for="id_unit"]').info('right',
        `This is how your assignment will be split and divided up
        
        e.g. If this assignment is reading a book, enter "Page"
        Try changing this name to something else if you're still confused

        If you are unsure how to split up your assignment, this is defaulted to "Minute"`
    );
    $('label[for="id_works"]').info('right',
        `The following is only relevant if you are re-entering this field

        This value is also the y-coordinate of the first point on the blue line, or the initial work input
        
        Changing this initial value will vertically translate all of your other work inputs accordingly`
    );
    $('label[for="id_funct_round"]').info('right',
        `This is the increment of work you will complete at a time
        
        For example, if you enter 3, you will only work in multiples of 3 (e.g: 6 units, 9 units, 15 units, etc)
        
        If you do not wish to use the grouping value, this is defaulted to 1`
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
        // Prevent button spam clicking
        $("#form-wrapper button").css("pointer-events", "none");
    });
    // Style errors if form is invalid
    $("#form-wrapper .error-note").each(function() {
        $(this).prev().children().eq(1).addClass("invalid");
        if (this.id === "error_id_x" || this.id === "error_id_works") {
            $(this).prev().prev().children().eq(1).addClass("invalid");
        }
    });
    // Delete assignment
    $('.delete-button').click(function() {
        if ($(document).queue().length === 0 && confirm('Are you sure you want to delete this assignment? (Press Enter)')) {
            // $(document).queue().length === 0 only runs this if no assignment is swapping; deleting while swapping is buggy
            const $this = $(this);
            const assignment_container = $this.parents(".assignment-container");
            new Promise(function(resolve) {
                // Scroll to assignment before it is deleted if out of view
                assignment_container[0].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
                // Same promise resolver logic as in priority.js
                resolver = resolve;
                $("main").scroll(_scroll);
                _scroll();
            }).then(function() {
                // Once the assignment, is done, this sends the data to the backend and animates its deletion
                let data = {
                    'csrfmiddlewaretoken': csrf_token,
                    'deleted': $this.val(), // Primary key value
                }
                const success = function() {
                    // If the data was successfully sent, delete the assignment
                    assignment_container.css({
                        // CSS doesn't allow transitions without presetting the property
                        // So, use $.animate to preset and animate its property, in this case is the height
                        "height": assignment_container.height() + 20,
                        "margin-bottom": "-10px",
                        "margin-top": "-10px",
                        "min-height": "0",
                        "pointer-events": "none",
                    }).children(":first-child").css({
                        // Absolutely position itself
                        "position": "absolute",
                        "opacity": "0",
                    });
                    // Remove assignment data from dat
                    dat.splice($("#assignments-container").children().index($this.parents(".assignment-container")),1);
                    // Animate height
                    assignment_container.animate({height: "10px"}, 750, "easeOutCubic", () => assignment_container.remove());
                }
                // Avoids page reload
                $.ajax({
                    type: "POST",
                    data: data,
                    success: success,
                    error: error,
                });
            });
        }
    });
});