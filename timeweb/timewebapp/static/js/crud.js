/*
This file includes the code for:

Swapping assignments in real time
Showing and hiding the new assignment form
Form utilities to make inputs more convenient
Updating assignments
Deleting assignments

This only runs on index.html
*/
// Note: modified assignment transitions for easing in and color are handled in priority.js because that part of the code was more fitting to put there
function showForm(show_instantly=false) {
    if (show_instantly) {
        $('#overlay').show().children("#form-wrapper").css("top", 15);
    } else {
        $("#overlay").fadeIn(300).children("#form-wrapper").animate({top: 15}, 300);
        if (!isMobile) {
            // Focus on first field
            $("#id_assignment_name").focus();
        }
        // Mobile
        $("#image-new-container").blur();
    }
    // Used in utils.js for handling the user typing "N" when showing the form via shift + N
    form_is_showing = true;
    // Explained later
    replaceUnit();
}
function hideForm(hide_instantly=false) {
    if (hide_instantly) {
        $("#overlay").hide().children("#form-wrapper");
        $(".error-note, .invalid").remove(); // Remove all error notes when form is exited
    } else {
        $("#overlay").fadeOut(300,function() {
            // Remove all error notes when form is exited
            $(".invalid").removeClass("invalid");
            $(".error-note").remove();
        }).children("#form-wrapper").animate({top: "0"}, 300);
    }
    // Used in utils.js for handling the user typing "N" when showing the form via shift + N
    form_is_showing = false;
}
// Replace fields with unit when unit is "Minute"
function replaceUnit() {
    const val = $("#id_unit").val().trim();
    const plural = pluralize(val),
        singular = pluralize(val,1);
    const units_of_time = {"minute": 1, "hour": 60};
    const chose_units_of_time = units_of_time[singular.toLowerCase()];
    // Replace fields
    // onlyText is defined at the bottom
    if (val) {
        if (chose_units_of_time) {
            $("label[for='id_y']").text(`Estimate how many ${plural[0].toUpperCase() + plural.substring(1).toLowerCase()} this assignment will Take to Complete`);
        } else {
            $("label[for='id_y']").text(`Total number of ${plural} in this Assignment`);
        }
        $("label[for='id_works']").onlyText(`Total number of ${plural} already Completed`);
        $("label[for='id_ctime']").text(`Estimated number of Minutes to complete each ${singular}`);
        $("label[for='id_funct_round']").onlyText(`Number of ${plural} you will Complete at a Time`);
        $("label[for='id_funct_round'] .info-button-text").text(`e.g: if you enter 3, you will only work in multiples of 3 (6 ${plural}, 9 ${plural}, 15 ${plural}, etc)`)
    } else {
        $("label[for='id_y']").html("Total number of Units in this Assignment");
        $("label[for='id_works']").onlyText("Total number of Units already Completed");
        $("label[for='id_ctime']").html("Estimated number of Minutes to complete each Unit");
        $("label[for='id_funct_round']").onlyText("Number of Units you will Complete at a Time");
        $("label[for='id_funct_round'] .info-button-text").text("e.g: if you enter 3, you will only work in multiples of 3 (6 units, 9 units, 15 units, etc)")
    }
    if (chose_units_of_time) {
        // Disable fields
        $("#id_ctime").val(chose_units_of_time);
        $("#id_ctime").prop("disabled",true).addClass("disabled-field");
        $("label[for='id_ctime']").addClass("disabled-field");
        if (def_funct_round_minute) {
            $("#id_funct_round").val(5);
            $("#id_funct_round").prop("disabled",true).addClass("disabled-field");
            $("label[for='id_funct_round']").addClass("disabled-field");
        }
    } else {
        $("#id_ctime").prop("disabled",false).removeClass("disabled-field");
        $("label[for='id_ctime']").removeClass("disabled-field");
        if (def_funct_round_minute) {
            $("#id_funct_round").prop("disabled",false).removeClass("disabled-field");
            $("label[for='id_funct_round']").removeClass("disabled-field");
        }
    }
}
$(function() {
    // Create and show a new form when user clicks new assignment
    $("#image-new-container").click(function() {
        // Set default values for a new form
        const initial_form_fields = ['', utils.formatting.stringifyDate(date_now), '', def_unit_to_minute ? "Minute" : '', '', '0', '', '', +def_min_work_time||''];
        initial_form_fields.forEach(function(element, index) {
            $(form_inputs[index]).val(element);
        });
        for (let break_day of Array(7).keys()) {
            // (break_days+6)%7) is for an ordering issue i think
            // Treat this as: $("#id_break_days_"+break_days).prop("checked", def_break_days.includes(break_days));
            $("#id_break_days_"+((break_day+6)%7)).prop("checked", def_break_days.includes(break_day));
        }
        // Set form text
        $("#new-title").html("New Assignment");
        $("#submit-assignment-button").html("Create Assignment").val('');
        // Show form
        showForm();
    });
    // Populate reentered form on modify
    $('.update-button').click(function() {
        // Set form text
        $("#new-title").html("Re-enter Assignment");
        $("#submit-assignment-button").html("Modify Assignment");
        // Find which assignment in dat was clicked
        const sa = utils.loadAssignmentData($(this).parents(".assignment"));
        // Reentered form fields
        const form_data = [
            sa.assignment_name,
            sa.ad,
            sa.x,
            sa.unit,
            +sa.y,
            +sa.works[0],
            +sa.ctime,
            sa.funct_round-1 ? +sa.funct_round : '', // Displays as self if it isn't 1, else display nothing
            +sa.min_work_time||'',
        ];
        // Set reentered form fields
        form_inputs.each((index, element) => $(element).val(form_data[index]));
        for (let break_day of Array(7).keys()) {
            // (break_day+6)%7) is for an ordering issue, ignore that
            // Treat this as: $("#id_break_days_"+break_day).prop("checked", def_break_days.includes(break_day));
            $("#id_break_days_"+((break_day+6)%7)).prop("checked", sa.break_days.includes(break_day));
        }
        // Set button pk
        $("#submit-assignment-button").val(sa.id);
        // Show form
        showForm();
    });
    // Hide form when cancel is clicked
    $("#form-wrapper #cancel-button").click(() => hideForm());
    $("#id_unit").on('input', replaceUnit);
    // Add info buttons ($.info defined in template.js)
    $('label[for="id_unit"]').info('right',
        `This is how your assignment will be split and divided up
        
        e.g: If this assignment is reading a book, enter "Chapter"

        If you're unsure how to split up your assignment, divide it up into units of time instead. Please enter "Minute" or "Hour"`
    );
    $('label[for="id_works"]').info('right',
        `The following is only relevant if you are re-entering this field

        This value is also the y-coordinate of the first point on the blue line, or the initial work input
        
        Changing this initial value will vertically translate all of your other work inputs accordingly`
    );
    $('label[for="id_funct_round"]').info('right',
        "e.g: if you enter 3, you will only work in multiples of 3 (6 units, 9 units, 15 units, etc)"
    );
    // All form inputs, can't use "#form-wrapper input:visible" because form is initially hidden
    const form_inputs = $("#form-wrapper input:not([type='hidden']):not([name='break_days'])");
    // Auto field scrolling
    form_inputs.focus(function() {
        this.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    });
    // "$(".error-note").length" is the same thing as {% field.errors %} in the template
    if ($(".error-note").length) {
        showForm(true); // Show instantly
    } else {
        hideForm(true); // Hide instantly
    }
    // Sets custom error message
    form_inputs.on("input invalid",function(e) {
        let message;
        if (e.type === "invalid") {
            switch ($(this).attr("id")) {
                case "id_assignment_name":
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
                case "id_funct_round":
                    message = 'Please enter a value';
                    break;
                case "id_min_work_time":
                    message = 'Please enter a minimum work time';
                    break;
            }
        } else {
            message = '';
        }
        this.setCustomValidity(message);
    });
    // Handles unloading and reloading of form
    // lighthouse says to use onpagehide instead of unload
    $(window).on('onpagehide' in self ? 'pagehide' : 'unload',function() {
        if ($("#form-wrapper").is(":visible")) {
            // Save form data to localStorage before unload
            localStorage.setItem("form_fields",
                JSON.stringify([
                    ...form_inputs.toArray().map(field => field.value),
                    $("#form-wrapper #break-days-wrapper input").toArray().map(break_day_field => break_day_field.checked),
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
        $("#form-wrapper #break-days-wrapper input").each(function(index) {
            $(this).prop('checked',pr_data[9][index]);
        });
    }
    // Form submission
    let submitted = false;
    $("#form-wrapper form").submit(function(e) {
        // Prevent submit button spam clicking
        if (submitted) {
            e.preventDefault();
        } else {
            submitted = true;
            // Enable disabled field on submit so it's sent with post
            $("#id_ctime, #id_funct_round").removeAttr("disabled");
            // JSON fields are picky with their number inputs, convert them to standard form
            if (+$("#id_works").val()) {
                $("#id_works").val(+$("#id_works").val());
            }
            gtag("event","modify_assignment");
        }
    });
    // Style errors if form is invalid
    $("#form-wrapper .error-note").each(function() {
        $(this).prev().children("input").first().addClass("invalid");
        // Give the previous field an error if appropriate
        if (this.id === "error_id_x" && $(this).text().includes("assignment") || this.id === "error_id_works" && $(this).text().includes("of")) {
            $(this).prev().prev().children("input").first().addClass("invalid");
        }
    });
    // Focus on first invalid field
    $("#form-wrapper .error-note").first().prev().children("input").first().focus();
    // Prevent label from stealing focus from info button
    $("#form-wrapper .info-button").click(() => false);
    // Delete assignment
    $('.delete-button').click(function(e) {
        const $this = $(this),
            dom_assignment = $this.parents(".assignment");
        if (e.shiftKey || confirm(isMobile ? 'Are you sure you want to delete this assignment?' : 'Are you sure you want to delete this assignment? (Press Enter)')) {
            // Unfocus to prevent pressing enter to click again
            $this.blur();
            // Deny updating or deleting again after queued
            dom_assignment.css("pointer-events", "none");
            $(document).queue(function() {
                // Send data to backend and animates its deletion
                const sa = utils.loadAssignmentData(dom_assignment);
                const success = function() {
                    new Promise(function(resolve) {
                        if (dom_assignment.hasClass("open-assignment")) {
                            dom_assignment.click().find(".graph-container").one("transitionend", resolve);
                        } else {
                            resolve();
                        }
                    }).then(function() {
                        // Opacity CSS transition
                        dom_assignment.css("opacity", "0");
                        const assignment_container = dom_assignment.parents(".assignment-container");
                        // Animate height on assignment_container because it doesn't have a transition
                        assignment_container.animate({marginBottom: -assignment_container.height()-10}, 750, "easeOutCubic", function() {
                            // Remove assignment data from dat
                            dat = dat.filter(sa_iter => sa.assignment_name !== sa_iter.assignment_name);
                            // Remove from DOM
                            assignment_container.remove();
                            $(document).dequeue();
                            // Don't want priority.sort to run while assignments are deleting because .stop() causes "ghost" assignments whose animate callbacks didn't run
                            if ($(document).queue().length === 0) {
                                priority.sort({ ignore_timeout: true });
                            }
                        });
                    });
                    if (!ajaxUtils.disable_ajax) {
                        gtag("event","delete_assignment");
                    }
                }
                if (ajaxUtils.disable_ajax) return success();
                const data = {
                    'csrfmiddlewaretoken': csrf_token,
                    'action': 'delete_assignment',
                    'assignments': [sa.id], // Primary key value
                }
                // Send ajax to avoid a page reload
                data.assignments = JSON.stringify(data['assignments']);
                $.ajax({
                    type: "POST",
                    data: data,
                    success: success,
                    error: function(response, exception) {
                        // If ajax failed, allow updating or deleting again and dequeue
                        dom_assignment.css("pointer-events", "auto");
                        $(document).dequeue();
                        ajaxUtils.error(response, exception);
                    }
                });
            });
        }
    });
});
// Only change text of form label
(function($) {
    $.fn.onlyText = function(text) {
        $(this).contents().filter(function() {
            return this.nodeType === Node.TEXT_NODE;
        }).first()[0].nodeValue = text;
        return $(this);
    };
}(jQuery));