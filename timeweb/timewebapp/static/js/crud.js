class Crud {
    static FORM_ANIMATION_DURATION = 300
    static getDefaultAssignmentFormFields = _ => ({
        "#id_name": '',
        "#id_assignment_date_daterangepicker": utils.formatting.stringifyDate(date_now),
        "#id_x_daterangepicker": (function() {
            const due_time = new Date(date_now.valueOf());
            due_time.setMinutes(SETTINGS.def_due_time.hour * 60 + SETTINGS.def_due_time.minute);
            return moment(due_time);
        })(),
        "#id_x": '',
        "#id_soft": false,
        "#id_unit": SETTINGS.def_unit_to_minute ? "Minute" : '',
        "#id_y": '',
        "#id_works": '0',
        "#id_time_per_unit": '',
        "#id_description": '',
        "#id_funct_round": '1',
        "#id_min_work_time": +SETTINGS.def_min_work_time||'',
        "#id_break_days": SETTINGS.def_break_days,
    })
    static getAssignmentFormFields = sa => ({
        "#id_name": sa.name,
        "#id_assignment_date_daterangepicker": sa.fake_assignment_date ? "" : utils.formatting.stringifyDate(sa.assignment_date),
        "#id_x_daterangepicker": (function() {
            const due_date = new Date(sa.assignment_date.valueOf());
            due_date.setDate(due_date.getDate() + Math.floor(sa.complete_x));
            due_date.setMinutes(due_date.getMinutes() + sa.due_time.hour * 60 + sa.due_time.minute);
            return moment(due_date);
        })(),
        "#id_soft": sa.soft,
        "#id_unit": sa.unit,
        "#id_y": sa.y,
        "#id_time_per_unit": sa.time_per_unit,
        "#id_description": sa.description,
        "#id_works": sa.works[0],
        "#id_funct_round": sa.funct_round,
        "#id_min_work_time": sa.original_min_work_time||'',
        "#id_break_days": sa.break_days,
    })
    static setAssignmentFormFields(formDict) {
        for (let [field, value] of Object.entries(formDict)) {
            if (field === "#id_break_days") continue;
            
            const field_is_daterangepicker = field.endsWith("_daterangepicker");
            if (field_is_daterangepicker) field = field.replace("_daterangepicker", "");

            const $field = $(field);
            if ($field.attr("type") === "checkbox")
                $field.prop("checked", value);
            else if (field_is_daterangepicker) {
                $field.data("daterangepicker").setStartDate(value);
                $field.data("daterangepicker").setEndDate(value);
            } else
                $field.val(value);
        }
        for (let break_day of Array(7).keys()) {
            // (break_day+6)%7) is for an ordering issue, ignore that
            // Treat this as $("#id_break_days_"+break_day)
            $(`#id_break_days_${(break_day+6) % 7}`).prop("checked", formDict["#id_break_days"].includes(break_day));
        }
    }
    static DEFAULT_DATERANGEPICKER_OPTIONS = {
        buttonClasses: "generic-button",
        parentEl: "main",
        showDropdowns: true,
        singleDatePicker: true,
    }
    static FORM_POSITION_TOP = 15
    static UNITS_OF_TIME = {minute: 1, hour: 60}
    static DELETE_ASSIGNMENT_TRANSITION_DURATION = 750 * SETTINGS.animation_speed
    static STEP_SIZE_AUTO_LOWER_ROUND = 0.05

    init() {
        const that = this;
        $("#id_assignment_date").daterangepicker({
            ...Crud.DEFAULT_DATERANGEPICKER_OPTIONS,
            autoApply: true,
            locale: {
                format: 'MM/DD/YYYY'
            },
        });
        $("#id_x").daterangepicker({
            ...Crud.DEFAULT_DATERANGEPICKER_OPTIONS,
            locale: {
                format: 'MM/DD/YYYY h:mm A'
            },
            timePicker: true,
            isInvalidDate: function(date) {
                return date.toDate() < new Date($("#id_assignment_date").val());
            },
        });
        that.setCrudHandlers();
        that.addInfoButtons();
        setTimeout(() => {
            that.styleErrors();
            // For when you enter more total units already completed than there are in the assignment
            if (that.invalidOnlyInAdvanced() || !!$("#id_y.invalid").length && !!$("#id_works.invalid").length) {
                $("#form-wrapper #advanced-inputs").click();
            }
        }, 0);

        // Place the handler before showForm so the .trigger("scroll") inside of it works
        $("#fields-wrapper").scroll(function() {
            let scroll_percentage = this.scrollTop / (this.scrollHeight - this.clientHeight) || 0;

            const unscrolled_height = +$(this).attr("unscrolled-height");
            const scrolled_height = +$(this).attr("scrolled-height");
            $("#fields-wrapper").css("height", unscrolled_height + (scrolled_height - unscrolled_height) * scroll_percentage);
        });

        if ($(".error-note").length) {
            that.showForm({ show_instantly: true })
        } else {
            that.hideForm({ hide_instantly: true });
        }
    }
    showForm(params={show_instantly: false}) {
        const that = this;
        setTimeout(function() {
            $("#id_description").trigger("input");
        }, 0);
        if (params.show_instantly) {
            $('#overlay').show().children("#form-wrapper").css("top", Crud.FORM_POSITION_TOP);
        } else {
            $("#overlay").fadeIn(Crud.FORM_ANIMATION_DURATION).children("#form-wrapper").animate({top: Crud.FORM_POSITION_TOP}, Crud.FORM_ANIMATION_DURATION);
            if (!isMobile) {
                $("form input:visible").first().focus();
            } else {
                $(document.activeElement).blur();
            }
        }
        $("main").css("overflow-y", "hidden");
        that.old_unit_value = undefined;
        that.replaceUnit();    
        
        if (that.invalidOnlyInAdvanced()) {
            $("#form-wrapper #advanced-inputs").click();
        }
    }
    hideForm(params={hide_instantly: false}) {
        const that = this;
        if (params.hide_instantly) {
            $("#overlay").hide().children("#form-wrapper");
            $(".error-note, .invalid").remove(); // Remove all error notes when form is exited
        } else {
            $("#overlay").fadeOut(Crud.FORM_ANIMATION_DURATION, function() {
                // Remove all error notes when form is exited
                $(".invalid").removeClass("invalid");
                $(".error-note").remove();
            }).children("#form-wrapper").animate({top: 0}, Crud.FORM_ANIMATION_DURATION);
        }
        // Fallback if "overlay" doesn't exist
        $("main").css("overflow-y", "scroll");
        $("main").css("overflow-y", "overlay");
    }
    replaceUnit() {
        const that = this;
        const val = $("#id_unit").val().trim();
        const plural = pluralize(val),
            singular = pluralize(val, 1),
            singularToLowerCase = singular.toLowerCase();
        if (val) {
            if (singularToLowerCase in Crud.UNITS_OF_TIME) {
                $("label[for='id_y']").text(`Estimate how many ${plural[0].toUpperCase() + plural.substring(1).toLowerCase()} this assignment will Take to Complete`);
            } else {
                $("label[for='id_y']").text(`Total number of ${plural} in this Assignment`);
            }
            $("label[for='id_works']").onlyText(`Total number of ${plural} already Completed`);
            $("label[for='id_time_per_unit']").text(`Estimated number of Minutes to complete each ${singular}`);
            $("label[for='id_funct_round'] ~ .info-button .info-button-text").text(`This is the number of ${plural} you will complete at a time. e.g: if you enter 3, you will only work in multiples of 3 (6 ${plural}, 9 ${plural}, 15 ${plural}, etc)`)
        } else {
            $("label[for='id_y']").html("Total number of Units in this Assignment");
            $("label[for='id_works']").onlyText("Total number of Units already Completed");
            $("label[for='id_time_per_unit']").html("Estimated number of Minutes to complete each Unit");
            $("label[for='id_funct_round'] ~ .info-button .info-button-text").text("This is the number of units of work you will complete at a time. e.g: if you enter 3, you will only work in multiples of 3 (6 units, 9 units, 15 units, etc)")
        }
        if (singularToLowerCase in Crud.UNITS_OF_TIME) {
            $("#id_time_per_unit").val(Crud.UNITS_OF_TIME[singularToLowerCase]);
            $("#id_time_per_unit").prop("disabled",true).addClass("disabled-field");
            $("label[for='id_time_per_unit']").addClass("disabled-field");
            if (SETTINGS.def_funct_round_minute && singularToLowerCase === "minute") {
                $("#id_funct_round").val(5);
                $("#id_funct_round").prop("disabled",true).addClass("disabled-field");
                $("label[for='id_funct_round']").addClass("disabled-field");
            }
        } else {
            that.old_unit_value in Crud.UNITS_OF_TIME && $("#id_time_per_unit").val("");
            $("#id_time_per_unit").prop("disabled",false).removeClass("disabled-field");
            $("label[for='id_time_per_unit']").removeClass("disabled-field");   
        }
        if (SETTINGS.def_funct_round_minute && singularToLowerCase !== "minute") {
            that.old_unit_value in Crud.UNITS_OF_TIME && $("#id_funct_round").val("1");
            $("#id_funct_round").prop("disabled",false).removeClass("disabled-field");
            $("label[for='id_funct_round']").removeClass("disabled-field");
        }
        that.old_unit_value = singularToLowerCase;
        // +1 to show the line under "Advanced Inputs"
        $("#fields-wrapper").attr("unscrolled-height", Math.ceil($("#advanced-inputs").position().top + $("#advanced-inputs").height() + parseFloat($("#advanced-inputs").css("margin-top")) + 5 + $("#fields-wrapper").scrollTop()));
        $("#fields-wrapper").attr("scrolled-height", $("#fields-wrapper > .field-wrapper:last").position().top + $("#fields-wrapper > .field-wrapper:last").height() - $("#form-wrapper #advanced-inputs").position().top + 15);
        $("#fields-wrapper").trigger("scroll");
    }
    setCrudHandlers() {
        const that = this;
        // Create and show a new form when user clicks new assignment
        $("#image-new-container").click(function() {
            Crud.setAssignmentFormFields(Crud.getDefaultAssignmentFormFields());
            $("#new-title").html("New Assignment");
            $("#submit-assignment-button").html("Create Assignment").val('');
            that.showForm();
        });
        // Populate form on edit
        $('.update-button').parent().click(function() {
            $("#new-title").html("Edit Assignment");
            $("#submit-assignment-button").html("Edit Assignment");
            const sa = utils.loadAssignmentData($(this));
            Crud.setAssignmentFormFields(Crud.getAssignmentFormFields(sa));
            if (sa.needs_more_info) {
                $.merge($("#form-wrapper #advanced-inputs").prevAll(), $("#form-wrapper #id-funct_round-field-wrapper")).each(function() {
                    const input = $(this).children("input");
                    input.toggleClass("invalid", !input.val());
                });
            }

            // Set button pk so it gets sent on post
            $("#submit-assignment-button").val(sa.id);
            that.showForm();
        });
        $('.delete-button').parent().click(function(e) {
            const $this = $(this);
            if (e.shiftKey) {
                that.deleteAssignment($this);
                return;
            }
            const sa = utils.loadAssignmentData($this);
            $.confirm({
                title: `Are you sure you want to delete assignment "${sa.name}"?`,
                content: 'This action is irreversible.',
                buttons: {
                    confirm: {
                        keys: ['Enter'],
                        action: function() {
                            that.deleteAssignment($this);
                        }
                    },
                    cancel: function() {
                        
                    }
                }
            });
        });

        // Arrow function to preserve this
        $("#form-wrapper #cancel-button").click(() => that.hideForm());
        $("#id_unit").on('input', () => that.replaceUnit());
        $("#id_description").expandableTextareaHeight();
        // Sets custom error message
        $("#id_name").on("input invalid",function(e) {
            if (utils.in_simulation) {
                this.setCustomValidity("You can't add or edit assignments in the simulation");
            } else {
                this.setCustomValidity(e.type === "invalid" ? 'Please enter an assignment name' : '');
            }
        });
        let alert_already_shown = false;
        $("#id_min_work_time, #id_time_per_unit").on("focusout", () => {
            
            if (!(
                // Criteria for doing this alert

                +$("#id_y").val() === 1 &&
                // <= 1 to alert again if it aleady alerted, meaning funct_round will be set to some number less than 1
                +$("#id_funct_round").val() <= 1 &&
                // + to make sure it isnt empty nor 0, as funct_round is then set to 0 or NaN
                +$("#id_min_work_time").val() &&
                +$("#id_time_per_unit").val() &&
                // Make sure the new funct_round value is less than 1
                +$("#id_time_per_unit").val() > +$("#id_min_work_time").val() &&
                !alert_already_shown
            )) return;
            const original_funct_round = +$("#id_funct_round").val();
            // funct_round * time_per_unit * y = min_work_time
            // funct_round * time_per_unit = min_work_time
            // funct_round = min_work_time / time_per_unit
            $("#id_funct_round").val(
                Math.max(Crud.STEP_SIZE_AUTO_LOWER_ROUND, // Don't want this to round to 0
                    mathUtils.precisionRound(
                        Crud.STEP_SIZE_AUTO_LOWER_ROUND * Math.round(
                            $("#id_min_work_time").val() / $("#id_time_per_unit").val()
                            / Crud.STEP_SIZE_AUTO_LOWER_ROUND
                        )
                    , 10)
                )
            );

            $.alert({
                title: `Your step size has been automatically changed from ${original_funct_round} to ${$("#id_funct_round").val()}`,
                content: "This is to prevent you from unnecessarily working longer than your minimum work time to ensure a smoother work schedule. The step size can be edited and overridden in the advanced inputs.",
                onClose: function() {
                    alert_already_shown = true;
                }
            })
        });

        let submitted = false;
        $("#form-wrapper form").submit(function(e) {
            window.disable_loading = true;
            // Prevent submit button spam clicking
            if (submitted) {
                e.preventDefault();
                return;
            }
            submitted = true;
            // Enable disabled field on submit so it's sent with post
            $("#id_time_per_unit, #id_funct_round").removeAttr("disabled");
            // JSON fields are picky with their number inputs, convert them to standard form
            $("#id_works").val() && $("#id_works").val(+$("#id_works").val());
            $("#submit-assignment-button").text("Submitting...");
            gtag("event","modify_assignment");
        });
    }
    addInfoButtons() {
        $("#id_unit").info('left',
            `This is how your assignment will be split and divided up
            
            e.g: If this assignment is reading a book, enter "Page" or "Chapter"

            If you're unsure how to split up your assignment, divide it up into units of time instead by entering "Minute" or "Hour"`, 
        "after").css({
            marginBottom: -14,
            float: 'right',
            left: -15,
            bottom: 20,
        });
        $("#id_works").info('left',
            `The following is only relevant if you're re-entering this field

            This value is also the y-coordinate of the first point on the blue line, and changing this initial value will vertically translate all of your other work inputs accordingly`,
        "after").css({
            marginBottom: -14,
            float: 'right',
            left: -15,
            bottom: 20,
        });
        $("#id_funct_round").info('left',
            "e.g: if you enter 3, you will only work in multiples of 3 (6 units, 9 units, 15 units, etc)",
        "after").css({
            marginBottom: -14,
            float: 'right',
            left: -15,
            bottom: 20,
        });
        $("#id_soft").info('left',
            `Soft due dates are automatically incremented if you haven't finished the assignment by then`,
        "after").css({
            marginRight: 9,
        })
    }
    styleErrors() {
        const that = this;
        // Style errors if form is invalid
        $("#form-wrapper .error-note").each(function() {
            $(this).siblings("input, textarea").addClass("invalid");
        });
        if ($("#id_x.invalid").length) {
            // Subtract one more px for minor positioning issues
            $(".field-wrapper#id-soft-field-wrapper").css("margin-top", `-=${$("#error_id_x").height()+1}`);
        }
    }
    // Delete assignment
    transitionDeleteAssignment(dom_assignment, params={final_iteration: false}) {
        const that = this;
        const sa = utils.loadAssignmentData(dom_assignment);

        // Make overflow hidden because trying transitioning margin bottom off the screen still allows it to be scrolled to
        // $("#assignments-container").css("overflow", "hidden"); (unhide this in the callback if this is added back)
        // NOTE: removed because of bugginess and just looking bad overall

        // Opacity CSS transition
        dom_assignment.css({
            opacity: "0",
            zIndex: dom_assignment.css("z-index")-2,
        });
        const assignment_container = dom_assignment.parents(".assignment-container");
        // Animate height on assignment_container because it doesn't have a transition
        const boxHeightMinusShortcuts = dom_assignment.outerHeight() + parseFloat(assignment_container.css("padding-top")) + parseFloat(assignment_container.css("padding-bottom"));
        dom_assignment.addClass("assignment-is-deleting");
        // Use css transitions because the animate property on assignment_container is reserved for other things in priority.js
        assignment_container.animate({marginBottom: -boxHeightMinusShortcuts}, Crud.DELETE_ASSIGNMENT_TRANSITION_DURATION, "easeOutCubic", function() {
            dat = dat.filter(_sa => sa.id !== _sa.id);
            // If a shorcut is in assignment_container, take it out so it doesn't get deleted
            assignment_container.children("#delete-starred-assignments, #autofill-work-done").insertBefore(assignment_container);
            // Remove assignment from DOM
            assignment_container.remove();
            // If you don't include this, drawFixed in graph.js when $(window).trigger() is run is priority.js runs and causes an infinite loop because the canvas doesn't exist (because it was removed in the previous line)
            dom_assignment.removeClass("assignment-is-closing");
            // Although nothing needs to be swapped, new Priority().sort() still needs to be run to recolor and prioritize assignments and place shortcuts accordingly
            params.final_iteration && new Priority().sort();
        });
        gtag("event","delete_assignment");
    }
    deleteAssignment($button) {
        const that = this;
        // Unfocus to prevent pressing enter to click again
        $button.blur();
        const dom_assignment = $button.parents(".assignment");
        // Deny updating or deleting again after queued
        dom_assignment.css("pointer-events", "none");
        // Send data to backend and animates its deletion
        const success = function() {
            that.transitionDeleteAssignment(dom_assignment, {final_iteration: true});
        }
        if (ajaxUtils.disable_ajax) {
            success();
            return;
        }
        const sa = utils.loadAssignmentData($button);
        const data = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'delete_assignment',
            'assignments': [sa.id],
        }
        $.ajax({
            type: "POST",
            data: data,
            success: success,
            error: function() {
                // If ajax failed, allow updating or deleting again
                dom_assignment.css("pointer-events", "auto");
                ajaxUtils.error(...arguments);
            }
        });
    }
    invalidOnlyInAdvanced() {
        const that = this;
        return !!$("#form-wrapper .invalid").first().parents(".field-wrapper").prevAll().filter(function() {
            return $(this).is("#form-wrapper #advanced-inputs");
        }).length;
    }
}
$(window).one("load", function() {
    new Crud().init();
});