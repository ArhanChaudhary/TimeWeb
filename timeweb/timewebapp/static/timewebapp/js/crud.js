class Crud {
    // IMPORTANT
    // Make sure these five functions mirror the corresponding backend logic
    static hoursToMinutes = hours => Crud.safeConversion(hours, 60);
    static minutesToHours = minutes => Crud.safeConversion(minutes, 1/60);
    static safeConversion = (value, factor) => {
        assert(Number.isFinite(factor));
        assert(Number.isFinite(value));
        if (factor < 1 || factor === 1) {
            return Math.round(value * factor * 100) / 100;
        } else if (factor > 1) {
            return Math.round(value * factor);
        }
    }
    static shouldConvertToHours = minutes => {
        let as_hours = Crud.minutesToHours(minutes);
        return as_hours >= 1 && as_hours % 0.5 === 0;
    }
    static shouldConvertToMinutes = hours => {
        let as_minutes = Crud.hoursToMinutes(hours);
        return !(as_minutes >= 60 && as_minutes % 30 === 0);
    }
    static getDefaultAssignmentFormFields = _ => ({
        "name": '',
        "assignment_date_daterangepicker": utils.formatting.stringifyDate(date_now),
        "x_daterangepicker": moment(new Date(date_now.valueOf())),
        "x": "",
        "soft": false,
        "unit": "Minute",
        "y": '',
        "works": 0,
        "time_per_unit": 1,
        "description": '',
        "funct_round": 5,
        "min_work_time": +SETTINGS.def_min_work_time||'',
        "break_days": SETTINGS.def_break_days,
    })
    static generateAssignmentFormFields = sa => {
        const fields = {
            "name": sa.name,
            "assignment_date_daterangepicker": sa.fake_assignment_date ? "" : utils.formatting.stringifyDate(sa.assignment_date),
            "x_daterangepicker": (function() {
                const due_date = new Date(sa.assignment_date.valueOf());
                if (!sa.complete_x) {
                    return moment(due_date);
                }
                due_date.setDate(due_date.getDate() + Math.floor(sa.complete_x));
                if (sa.due_time && (sa.due_time.hour || sa.due_time.minute)) {
                    due_date.setMinutes(due_date.getMinutes() + sa.due_time.hour * 60 + sa.due_time.minute);
                }
                return moment(due_date);
            })(),
            "soft": sa.soft,
            "unit": sa.unit,
            "y": sa.y,
            "time_per_unit": sa.time_per_unit,
            "description": sa.description,
            "works": sa.works[0],
            "funct_round": sa.funct_round,
            "min_work_time": sa.original_min_work_time,
            "break_days": sa.break_days,
        }
        if (!sa.complete_x) fields.x = "";
        return fields;
    }
    static setAssignmentFormFields(formDict) {
        const normalized_unit = pluralize(formDict.unit, 1).toLowerCase();
        for (let [field, value] of Object.entries(formDict)) {
            const field_is_daterangepicker = field.endsWith("_daterangepicker");
            if (field_is_daterangepicker) field = field.replace("_daterangepicker", "");
            const $field = $("#id_" + field);

            switch (field) {
                case "break_days":
                    for (let break_day of Array(7).keys()) {
                        // (break_day+6)%7) is for an ordering issue, ignore that
                        // Treat this as $("#id_def_break_days_"+break_day)
                        $(`#id_def_break_days_${(break_day+6) % 7}`).prop("checked", value.includes(break_day));
                    }
                    continue;
                case "unit":
                    switch (normalized_unit) {
                        case "minute":
                            $("#y-widget-checkbox").prop("checked", false);
                            $field.val("");
                            break;
                        case "hour":
                            $("#y-widget-checkbox").prop("checked", true);
                            $field.val("");
                            break;
                        default:
                            // if we set it to true it could be converted to minutes for no reason
                            $("#y-widget-checkbox").prop("checked", false);
                            $field.val(value);
                    }
                    continue;
                case "works":
                case "funct_round":
                    switch (normalized_unit) {
                        case "minute":
                            // value is undefined?
                            if (Crud.shouldConvertToHours(value)) {
                                $(`#${field}-widget-checkbox`).prop("checked", true);
                                $field.val(Crud.minutesToHours(value));
                            } else {
                                $(`#${field}-widget-checkbox`).prop("checked", false);
                                $field.val(value);
                            }
                            break;
                        case "hour":
                            if (Crud.shouldConvertToMinutes(value)) {
                                $(`#${field}-widget-checkbox`).prop("checked", false);
                                $field.val(Crud.hoursToMinutes(value));
                            } else {
                                $(`#${field}-widget-checkbox`).prop("checked", true);
                                $field.val(value);
                            }
                            break;
                        default:
                            // if we set it to true it could be converted to minutes for no reason
                            $(`#${field}-widget-checkbox`).prop("checked", false);
                            $field.val(value);
                    }
                    continue;
                case "min_work_time":
                    if (Number.isFinite(formDict.time_per_unit) && Number.isFinite(value))
                        value = Crud.safeConversion(value, formDict.time_per_unit);
                case "min_work_time":
                // it's fine if time_per_unit widget checkbox is set even when hidden
                // this is because the unit for this field is always "minute" or "hour"
                // so it's fine to interchange between the two
                // works, however, can refer to units other than "minute" or "hour", so this does
                // not apply to that
                case "time_per_unit":
                    if (Number.isFinite(value) && Crud.shouldConvertToHours(value)) {
                        $(`#${field}-widget-checkbox`).prop("checked", true);
                        $field.val(Crud.minutesToHours(value));
                    } else {
                        $(`#${field}-widget-checkbox`).prop("checked", false);
                        $field.val(value);
                    }
                    continue;
            }

            if ($field.attr("type") === "checkbox")
                $field.prop("checked", value);
            else if (field_is_daterangepicker && 
                // ensure it doesn't display "Invalid date"
                value !== "") {
                $field.data("daterangepicker").setStartDate(value);
                $field.data("daterangepicker").setEndDate(value);
            } else
                $field.val(value);
        }
    }
    static DEFAULT_DATERANGEPICKER_OPTIONS = {
        buttonClasses: "generic-button",
        parentEl: "main",
        showDropdowns: true,
        singleDatePicker: true,
    }
    // it is important to use .click instead of .prop("checked", true/false) so the animation click handler fires
    static STANDARD_FIELD_GROUP = () => {
        if ($("#form-wrapper #field-group-picker-checkbox").prop("checked")) {
            $("#form-wrapper #field-group-picker").click();
        }
    }
    static ADVANCED_FIELD_GROUP = () => {
        if (!$("#form-wrapper #field-group-picker-checkbox").prop("checked")) {
            $("#form-wrapper #field-group-picker").click();
        }
    }
    static TOGGLE_FIELD_GROUP = () => $("#form-wrapper #field-group-picker").click()
    static GO_TO_FIELD_GROUP = params => {
        if (params.standard) {
            Crud.STANDARD_FIELD_GROUP();
        } else if (params.advanced) {
            Crud.ADVANCED_FIELD_GROUP();
        } else if (params.toggle) {
            Crud.TOGGLE_FIELD_GROUP();
        } else if (params.$dom_group) {
            assert(params.$dom_group.hasClass("field-group") || params.$dom_group.length === 0);
            switch (params.$dom_group.attr("id")) {
                case "first-field-group":
                    Crud.STANDARD_FIELD_GROUP();
                    break;

                case "second-field-group":
                    Crud.ADVANCED_FIELD_GROUP();
                    break;
            }
        }
    }
    alertEarlyDueDate() {
        const that = this;
        const picker = $("#id_x").data("daterangepicker");
        if (!(
            6 <= picker.startDate.hours() && picker.startDate.hours() <= 11
        ) || that.alerted_early_due_time) return;
        that.alerted_early_due_time = true;

        $.alert({
            title: `Your due time of ${picker.startDate.format("h:mm A")} is early.`,
            content: "TimeWeb assigns work past midnight for assignments due in the morning. To avoid this, set the due time to midnight.",
            backgroundDismiss: false,
            buttons: {
                ignore: function() {
                    
                },
                "Set to midnight": {
                    action: function() {
                        picker.setStartDate(picker.startDate.startOf("day"));
                    },
                },
            },
        });
    }
    init() {
        const that = this;
        // https://stackoverflow.com/questions/7668525/is-there-a-jquery-selector-to-get-all-elements-that-can-get-focus
        Crud.ALL_FOCUSABLE_FORM_INPUTS = $('#fields-wrapper').find("a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex], [contenteditable]")
            .filter(function() {
                return !$(this).attr("name")?.endsWith("-widget-checkbox");
            });
        setTimeout(() => {
            // no today's date button because it already defaults to today on new assignment
            // although a user might want a today button for editing an assignment date to today
            // such a scenario is rare to happen; adding a today date button is a waste of space
            let last_assignment_date_input_val;
            $("#id_assignment_date").daterangepicker({
                ...Crud.DEFAULT_DATERANGEPICKER_OPTIONS,
                autoApply: true,
                locale: {
                    format: 'MM/DD/YYYY'
                },
                parentEl: "#form-wrapper",
            }).on('input', function() {
                last_assignment_date_input_val = $(this).val();
            }).on('hide.daterangepicker', function(e, picker) {
                if (last_assignment_date_input_val === "") {
                    last_assignment_date_input_val = utils.formatting.stringifyDate(date_now);
                    $(this).val(last_assignment_date_input_val);
                    picker.setStartDate(last_assignment_date_input_val);
                    picker.setEndDate(last_assignment_date_input_val);
                }
            });
            let old_due_date_val;
            $("#id_x").daterangepicker({
                ...Crud.DEFAULT_DATERANGEPICKER_OPTIONS,
                locale: {
                    format: 'MM/DD/YYYY h:mm A'
                },
                timePicker: true,
                parentEl: "#form-wrapper",
            }).on('show.daterangepicker', function(e, picker) {
                old_due_date_val = $(this).val();
                picker.container.css("transform", `translateX(${$("#form-wrapper #fields-wrapper").css("--magic-wand-width").trim()})`);
            }).on('cancel.daterangepicker', function(e, picker) {
                $(this).val(old_due_date_val);
            });
            Crud.ALL_FOCUSABLE_FORM_INPUTS.each(function() {
                if ($(this).is("#id_x")) {
                   var event = "apply.daterangepicker";
                } else {
                   var event = "focusout";
                }
                $(this).on(event, function() {
                    if ($("#overlay").hasClass("show-form"))
                        that.alertEarlyDueDate();
                });
            })
            that.setCrudHandlers();
        }, 0);
        
        Crud.info('#id_name', 'left', 'after',
            `Only enter an assignment's name to mark it as "needs more info"
            
            Disables functionality but useful as a reminder for short assignments`
        ).css({
            marginTop: -23,
            marginLeft: "auto",
            marginRight: 7,
        });
        Crud.info('#id_unit', 'left', 'after',
            `This is how your assignment will be split and divided up
            
            i.e. If this assignment is reading a book, enter "Page" or "Chapter"`, 
        ).css({
            marginTop: -23,
            marginLeft: "auto",
            marginRight: 7,
        });
        Crud.info('#id_works', 'left', 'after',
            `This is also your initial work input, so changing this value will vertically translate all of your other work inputs accordingly`,
        ).css({
            marginRight: -17,
            bottom: -9,
            right: 23,
        });
        Crud.info('#id_funct_round', 'left', 'after',
            "", // overridden in replaceUnit
        ).css({
            marginRight: -17,
            bottom: -9,
            right: 23,
        });
        Crud.info('label[for="id_soft"]', 'left', 'append',
            `Soft due dates are automatically incremented if you haven't finished the assignment by then`,
        ).css({
            marginLeft: 4,
        });
    }
    showForm() {
        const that = this;
        $("#overlay").removeClass("hide-form").addClass("show-form").trigger("transitionend");
        $(".field-wrapper.disabled-field").each(function() {
            $(this).find(".magic-wand-icon").click();
        });
        delete that.one_unit_of_work_alert_already_shown;
        delete that.alerted_early_due_time;
        delete that.old_unit_value;
        delete that.sa_id;
        delete that.prevent_submission;
        that.replaceUnit();

        setTimeout(function() {
            $("#form-wrapper form input:visible").first().focus();
            $("#id_description").trigger("input");
        // have a timeout so the edit button flashes when you click it
        }, 75);
    }
    hideForm() {
        const that = this;

        $("#overlay").removeClass("show-form").addClass("hide-form").on("transitionend", function(e) {
            // ?. in case transitionend is manually called
            if (e.originalEvent && e.originalEvent.target !== this) return;

            $(this).off("transitionend");
            // Remove all error notes when form is exited
            $(".invalid").removeClass("invalid");
            $(".assignment-form-error-note").remove();
            Crud.GO_TO_FIELD_GROUP({standard: true});
            // You may stll be focused on an <input> when the form is hidden, invalidating keybinds
            $(document.activeElement).blur();
        });
        $("#form-wrapper input").each(function() {
            // hideForm when not focused on an input (such as pressing escape) sometimes forgets to hide the daterangepicker
            // manually do so
            if ($(this).data("daterangepicker")?.container.is(":visible")) {
                $(this).trigger("blur");
            }
        });
    }
    replaceUnit() {
        const that = this;

        if (that.replaceUnit.is_currently_running) {
            that.replaceUnit.recurse = true;
        } else {
            that.replaceUnit.is_currently_running = true;
            that.replaceUnitWithoutTimeout();
            // If replaceUnitWithoutTimeout is run very quickly, it is possible for it to run the unit is of time branch
            // while the setTimeout underneath still hasn't ran
            // Queue up a recursion if that happens

            // setTimeout to run after the setTimeout in replaceUnitWithoutTimeout is done (or else .hide-field logic doesnt run and it glitches)
            setTimeout(function() {
                if (that.replaceUnit.recurse) {
                    that.replaceUnit.recurse = false;
                    that.replaceUnit.is_currently_running = false;
                    that.replaceUnit();
                } else {
                    that.replaceUnit.is_currently_running = false;
                }
            }, 0);
        }
    }
    replaceUnitWithoutTimeout() {
        const that = this;

        // Can't directly juse .slice() it because safari returns the psuedo's content without quotes
        let val = $("#id_unit").val().trim() || utils.getPseudoStyle($("#id_y ~ .field-widget"), "::after", "content");
        if (val.substring(0, 1) === "\"" && val.substring(val.length - 1) === "\"")
            val = val.slice(1, -1);
        let plural = pluralize(val),
            singular = pluralize(val, 1);
        if (["minute", "hour"].includes(singular.toLowerCase())) {
            $("label[for='id_works']").text(`How long have you already worked`);

            if (that.old_unit_value === undefined ||
                // if you enter a character and delete it really fast let's see what happens
                // the setTimeout removes all .hide-field but most importandly removes their margin top
                // then what the character is deleted the second part of this if statement runs and places back #id_y
                // after its closing transition is finished
                // however if you do this really quickly the margin-top doesn't change enough when it is removed to trigger the transitionend event
                // let's manually specify this condition to ensure this case is properly handled
                !["minute", "hour"].includes(that.old_unit_value) && parseFloat($("#id-y-field-wrapper").css("margin-top")) === -$("#id-y-field-wrapper").outerHeight()) {
                // Appropiately place #id_y when the form is initially loaded and shown
                // Simulates the state of #id-y-field-wrapper after transitionend
                $("#id-y-field-wrapper")
                    .insertAfter($("#id-x-field-wrapper"))
                    .removeClass("hide-field").css("margin-top", "")
                    .addClass("has-widget")
                    .find(Crud.ALL_FOCUSABLE_FORM_INPUTS).attr("tabindex", "");
                $("label[for='id_y']").text(`How long will this assignment take to complete`);
            } else if (!["minute", "hour"].includes(that.old_unit_value)) {
                $("#id-y-field-wrapper").addClass("hide-field").css("margin-top", -$("#id-y-field-wrapper").outerHeight())
                    .on("transitionend", function(e) {
                        if (e.originalEvent !== undefined // for .trigger
                            && e.originalEvent.propertyName !== "margin-top") return;

                        $(this).off("transitionend")
                            .removeClass("hide-field").css("margin-top", "")
                            .insertAfter($("#id-x-field-wrapper"))
                            .addClass("has-widget")
                            .find(Crud.ALL_FOCUSABLE_FORM_INPUTS).attr("tabindex", "");
                        // Don't immediately change text back to how #id_y initially looks like to make it seemless
                        $("label[for='id_y']").text(`How long will this assignment take to complete`);
                    })
                    .find(Crud.ALL_FOCUSABLE_FORM_INPUTS).attr("tabindex", -1);
                // don't change the step size nor time per unit here, read the below comment
            } else {
                // Normal text change if there's nothing to do with #id_y
                $("label[for='id_y']").text(`How long will this assignment take to complete`);
                $("#id-y-field-wrapper").addClass("has-widget");
            }
            $("#id-time_per_unit-field-wrapper").addClass("hide-field").css("margin-top", -$("#id-time_per_unit-field-wrapper").outerHeight())
                .find(Crud.ALL_FOCUSABLE_FORM_INPUTS).attr("tabindex", -1);
            $("#id-works-field-wrapper, #id-funct_round-field-wrapper").addClass("has-widget");

            if (singular.toLowerCase() === "minute") {
                if (!["minute", undefined].includes(that.old_unit_value)) {
                    // if you set a step size to some value with some unit of work, clear the unit of work, and re-enter the same thing
                    // the step size will be set to 0.5 or 5 instead of what was originally entered
                    // but who really cares this is what i see as expected behavior and is the user's responsibility to notice
                    $("#funct_round-widget-checkbox").prop("checked", false);
                    $("#id_funct_round").val(5);

                    // let's not ensure minimum work time is never less than the step size
                    // it may be very confusing to the user to see the minimum work time 
                    // field randomly change form toggling the y checkbox. Minimum work
                    // time anyways represents a user's preference and inputted value.
                    // We can take care of the original goal of trying to ensure the minimum
                    // work time is never less than the step size by playing it off
                    // as a natural side effect (i.e minutes are always rounded to the 
                    // nearest 5 NATURALLY and hours are always rounded to the nearest 0.5
                    // NATURALLY)
                }
                // we can do this because this value is only ever set when this field is anyways invisible,
                // and when the unit of work is cleared this field is then emptied!
                $("#id_time_per_unit").val(1);
                $("#time_per_unit-widget-checkbox").prop("checked", false);
            } else if (singular.toLowerCase() === "hour") {
                // (same two above comments apply here too)
                if (!["hour", undefined].includes(that.old_unit_value)) {
                    $("#funct_round-widget-checkbox").prop("checked", false);
                    $("#id_funct_round").val(30);
                }
                $("#id_time_per_unit").val(1);
                $("#time_per_unit-widget-checkbox").prop("checked", true);
            }
            $("label[for='id_funct_round'] ~ .info-button .info-button-text").text(`This is the length of time that you will work in increments of
        
            i.e. if you enter 5 minutes, you will only work in multiples of 5 minutes (10m, 25m, 1h, etc)`)
        } else {
            // Make sure this is ran before the .text because this can affect #id_y's text
            $("#id-y-field-wrapper").trigger("transitionend").off("transitionend");

            $("label[for='id_y']").text(`Total number of ${plural} in this assignment`);
            $("label[for='id_time_per_unit']").text(`How long does it take to complete each ${singular}`);
            $("label[for='id_works']").text(`Total number of ${plural} already completed`);

            setTimeout(function() {
                $(".hide-field").removeClass("hide-field").css("margin-top", "")
                    .find(Crud.ALL_FOCUSABLE_FORM_INPUTS).attr("tabindex", "");
            }, 0);
            $("#id-y-field-wrapper, #id-works-field-wrapper, #id-funct_round-field-wrapper").removeClass("has-widget");

            if (that.old_unit_value === undefined) {
                // Appropiately place #id_y when the form is initially loaded and shown
                // Simulates the state of #id-y-field-wrapper after the .hide-field setTimeout
                $("#id-y-field-wrapper")
                    .insertAfter($("#id-unit-field-wrapper"))
                    .find(Crud.ALL_FOCUSABLE_FORM_INPUTS).attr("tabindex", "");
            } else if (["minute", "hour"].includes(that.old_unit_value)) {
                $("#id-y-field-wrapper").addClass("hide-field").css("margin-top", -$("#id-y-field-wrapper").outerHeight())
                    .insertAfter($("#id-unit-field-wrapper"));
                $("#id_time_per_unit").val("");
                $("#time_per_unit-widget-checkbox").prop("checked", false);
                $("#id_funct_round").val(1);
            }
            $("label[for='id_funct_round'] ~ .info-button .info-button-text").text(`This is the number of ${plural} you will complete at a time
        
            i.e. if you enter 3, you will only work in multiples of 3 (6 ${plural}, 9 ${plural}, 15 ${plural}, etc)`)
        }
        that.old_unit_value = singular.toLowerCase();
    }
    addErrorNotes(field_wrapper, error_list, is_potato) {
        const that = this;

        if (is_potato) {
            $(document.activeElement).blur();
            field_wrapper.addClass("potato");
        }
        const dom_errors = $("<div>").addClass("assignment-form-error-note");
        for (const error of error_list) {
            if (is_potato) {
                dom_errors.append(error);
            } else {
                dom_errors.append(document.createTextNode(error));
            }
            dom_errors.append("<br>");
        }
        const field_wrapper_input = field_wrapper.find(Crud.ALL_FOCUSABLE_FORM_INPUTS).not(".field-widget-checkbox");
        field_wrapper_input.addClass("invalid");
        that.removeErrorNotes(field_wrapper.find(".assignment-form-error-note"));
        field_wrapper.append(dom_errors);

        dom_errors.addClass("transition-disabler");
        // Need to use jquery instead of css to set marginLeft
        dom_errors.css({
            marginTop: -dom_errors.outerHeight(),
            opacity: 0,
            transform: "scale(0.9)",
        });
        dom_errors[0].offsetHeight;
        dom_errors.removeClass("transition-disabler");
        dom_errors.css({
            marginTop: "",
            opacity: "",
            transform: "",
        });

        const ordered = Crud.ALL_FOCUSABLE_FORM_INPUTS.toArray();

        const old_input = Crud.old_input;
        const new_input = field_wrapper_input[0];
        Crud.old_input = new_input;

        const old_index = ordered.indexOf(old_input);
        const new_index = ordered.indexOf(new_input);

        if (new_index > old_index) {
            clearTimeout(Crud.post_add_error_scroll);
            Crud.post_add_error_scroll = setTimeout(function() {
                delete Crud.post_add_error_scroll;
                delete Crud.old_input;
                Crud.GO_TO_FIELD_GROUP({$dom_group: field_wrapper.parents(".field-group")});
            }, 0);
        }
    }
    removeErrorNotes(dom_errors) {
        dom_errors.css({
            marginTop: -dom_errors.outerHeight(),
            opacity: 0,
            transform: "scale(0.9)",
        }).one("transitionend", function() {
            $(this).remove();
        });
    }
    setCrudHandlers() {
        const that = this;
        // Create and show a new form when user clicks new assignment
        $("#image-new-container").click(function() {
            Crud.setAssignmentFormFields(Crud.getDefaultAssignmentFormFields());
            $("#new-title").text("New Assignment");
            $("#submit-assignment-button").text("Create Assignment");
            that.showForm();
        });
        $(document).click(function(e) {
            const $this = $(e.target).closest($('.update-button').parent());
            if (!$this.length) return;

            const dom_assignment = $this.parents(".assignment");
            const sa = utils.loadAssignmentData(dom_assignment);
            $("#new-title").text("Edit Assignment");
            $("#submit-assignment-button").text("Edit Assignment");
            Crud.setAssignmentFormFields(Crud.generateAssignmentFormFields(sa));
            if (sa.needs_more_info) {
                $("#form-wrapper .field-wrapper:not(.hide-field) > :not(label, .magic-wand-icon, .dont-mark-invalid-if-empty, .info-button)").each(function() {
                    $(this).toggleClass("invalid", !$(this).val());
                });
            }
            that.showForm();
            that.sa_id = sa.id;
            if (!(sa.is_google_classroom_assignment && sa.needs_more_info))
                that.alerted_early_due_time = true; // dont display the early due time alert in edit
        });
        $(document).click(function(e) {
            const $this = $(e.target).closest($('.delete-button, .restore-button').parent());
            if (!$this.length) return;

            const dom_assignment = $this.parents(".assignment");
            // shift + d while in the close assignment transition bugs it
            // use transitionend to run this
            new Promise(function(resolve) {
                if (dom_assignment.hasClass("assignment-is-closing")) {
                    dom_assignment.find(".assignment-footer").one("transitionend", resolve);
                } else {
                    resolve();
                }
            }).then(function() {
                if ($this.children(".delete-button").length) {
                    if (e.shiftKey) {
                        Crud.deleteAssignment(dom_assignment);
                        return;
                    }
                    const sa = utils.loadAssignmentData(dom_assignment);
                    $.alert({
                        title: `Are you sure you want to delete assignment "${sa.name}"?`,
                        content: utils.formatting.getReversibilityStatus(),
                        buttons: {
                            confirm: {
                                keys: ['Enter'],
                                action: function() {
                                    Crud.deleteAssignment(dom_assignment);
                                }
                            },
                            cancel: function() {
                                
                            }
                        }
                    });
                } else if ($this.children(".restore-button").length) {
                    Crud.deleteAssignment(dom_assignment, {restore: true});
                }
            });
        });

        // Arrow function to preserve this
        $("#form-wrapper #cancel-button").click(() => that.hideForm());
        $("#form-wrapper #field-group-picker").click(() => {
            $("#first-field-group, #second-field-group").trigger("transitionend");
            let second_minus_first = $("#form-wrapper #second-field-group .instant-margin-transition")[0].scrollHeight - $("#form-wrapper #first-field-group .instant-margin-transition")[0].scrollHeight;
            if ($("#form-wrapper #field-group-picker-checkbox").prop("checked")) {
                $("#first-field-group").css("margin-bottom", -second_minus_first).one("transitionend", function() {
                    $("#first-field-group").addClass("transition-disabler");
                    $("#first-field-group").css("margin-bottom", "");
                    $("#first-field-group")[0].offsetHeight;
                    $("#first-field-group").removeClass("transition-disabler");
                    $("#first-field-group .instant-margin-transition").css("margin-bottom", "");
                });
                $("#first-field-group .instant-margin-transition").css("margin-bottom", second_minus_first);
            } else {
                $("#second-field-group").css("margin-bottom", second_minus_first).one("transitionend", function() {
                    $("#second-field-group").addClass("transition-disabler");
                    $("#second-field-group").css("margin-bottom", "");
                    $("#second-field-group")[0].offsetHeight;
                    $("#second-field-group").removeClass("transition-disabler");
                    $("#second-field-group .instant-margin-transition").css("margin-bottom", "");
                });
                $("#second-field-group .instant-margin-transition").css("margin-bottom", -second_minus_first);
            }
        });
        $("#id_unit, #y-widget-checkbox").on('input', () => that.replaceUnit());
        let recursion_stopper = false;
        $(".magic-wand-icon").click(function() {
            if ($(".disabled-field .magic-wand-icon").not($(this)).length === 1 && !recursion_stopper) {
                recursion_stopper = true;
                $(".disabled-field .magic-wand-icon").not($(this)).click();
            }
            recursion_stopper = false;
            const field_wrapper = $(this).parents(".field-wrapper");
            const field_wrapper_input = field_wrapper.find(Crud.ALL_FOCUSABLE_FORM_INPUTS).not(".field-widget-checkbox");
            field_wrapper.toggleClass("disabled-field");
            const was_just_disabled = field_wrapper.hasClass("disabled-field");

            if (field_wrapper.attr("original-type") === undefined)
                field_wrapper.attr("original-type", field_wrapper_input.attr("type"));
            // If you predict the field while the unit is hour, the unit is hidden but actually stays as hour in the html
            // and is sent in the submit assignment. The prediction logic relies on the unit being minute, so we can't
            // allow this to happen
            // Conditions to manually set the unit to hour:
            if (
                // just clicked the predict button
                was_just_disabled &&
                // is the y field
                field_wrapper_input.is("#id_y") &&
                // the unit is hour

                // use .find instead of .children because the input can be inside the label
                // it's fine if this is true when unit isnt of time and was instead set to "Hour" before manually
                // entering a unit. It will have no affect because replaceUnit will internally define unit to anyways
                // be the field's value
                field_wrapper.find(".field-widget-checkbox").prop("checked")
            )
                field_wrapper.find(".field-widget").click();
            field_wrapper_input.attr("type", was_just_disabled ? "text" : field_wrapper.attr("original-type"));
            field_wrapper_input.prop("disabled", was_just_disabled).val(was_just_disabled ? "Predicted" : "");
        });
        let preventRecursion;
        $("#fields-wrapper").find(Crud.ALL_FOCUSABLE_FORM_INPUTS).on('focus', e => {
            if (preventRecursion) {
                preventRecursion = false;
                return;
            }
            const new_parent = $(e.target).parents(".field-group");
            const old_parent = $(e.relatedTarget).parents(".field-group");
            if (!new_parent.is(old_parent) && old_parent.length && new_parent.length
                // Prevent infinite recursion
                && e.relatedTarget !== undefined && e.relatedTarget !== null) {
                if (SETTINGS.animation_speed) {
                    preventRecursion = true;
                    e.relatedTarget.focus();
                    e.relatedTarget.blur();
                }
                Crud.GO_TO_FIELD_GROUP({ $dom_group: new_parent });
                if (SETTINGS.animation_speed) {
                    $("#first-field-group").one("transitionend", function() {
                        preventRecursion = true;
                        e.target.focus();
                        $(document).off("keypress.fieldgroupanimation");
                    });
                    $(document).one("keypress.fieldgroupanimation", () => $("#first-field-group").trigger("transitionend"));
                }
            // If the user goes to the advanced tab and presses tab after currently being focused on the element before the first
            // input in the standard tab, it will instead focus on that and give focus to a completely invisible element
            // This checks for when that happens and appropriately gives focus to the correct element

            // new_parent.is("#first-field-group") instead of new_parent.length because a click event is too similar to a tabbing event
            // this detects a tabbing event only
            } else if (new_parent.is("#first-field-group") && !old_parent.length && $("#form-wrapper #field-group-picker-checkbox").prop("checked")) {
                // Doesn't work because #id_y is first in Crud.ALL_FOCUSABLE_FORM_INPUTS and can cause that to be focused instead
                // $("#second-field-group").find(Crud.ALL_FOCUSABLE_FORM_INPUTS).first().focus();

                preventRecursion = true;
                $("#second-field-group .field-wrapper").first().find(Crud.ALL_FOCUSABLE_FORM_INPUTS).focus();
            }
        });

        // Auto-converts mintues to hours and vice versa
        // Removed due to generally just being annoying
        // uncomment if needed

        // $(".field-widget-checkbox").on('input', function() {
        //     let widget_input = $(this).prevAll("input:not([id^=\"initial\"]):first");
        //     if (["", "Predicted"].includes(widget_input.val())) return;
        //     if ($(this).prop("checked")) {
        //         widget_input.val(Crud.minutesToHours(widget_input.val()));
        //     } else {
        //         widget_input.val(Crud.hoursToMinutes(widget_input.val()));
        //     }
        // });
        $("#id_y, #id_x, #id_assignment_date, #id_min_work_time, #id_time_per_unit").on("focusout", () => {
            let time_per_unit = $("#id_time_per_unit");
            if ($("#time_per_unit-widget-checkbox").prop("checked")) {
                time_per_unit = Math.round(+time_per_unit.val() * 60);
            } else {
                time_per_unit = +time_per_unit.val();
            }
            // we don't need to use min_work_time_funct_round instead because it is irrelevant when y is 1
            let min_work_time = $("#id_min_work_time");
            if ($("#time_per_unit-widget-checkbox").prop("checked")) {
                min_work_time = Math.round(+min_work_time.val() * 60);
            } else {
                min_work_time = +min_work_time.val();
            }
            let complete_x = mathUtils.daysBetweenTwoDates(
                new Date($("#id_x").val()),
                new Date($("#id_assignment_date").val()),
                {round: false}
            );
            if (!(
                // Criteria for doing this alert

                +$("#id_y").val() === 1 &&
                // make sure isnt empty nor 0
                min_work_time && time_per_unit && complete_x &&
                // 15 min work time => 5 days and 1h30m time_per_unit for this alert
                // 1hr min work time => 5 days and 3h time_per_unit for this alert
                time_per_unit >= Math.max(min_work_time, 30) * 3 &&
                complete_x >= 5 &&
                !that.one_unit_of_work_alert_already_shown
            )) return;

            $.alert({
                title: "This assignment is <b>strongly not recommended</b> to be created with only one unit of work in this manner.",
                content: "Please consider splitting up your assignment into either 1) smaller and more plentiful units of work or 2) units of time, by clearing the name of each unit of work field.",
                onClose: function() {
                    that.one_unit_of_work_alert_already_shown = true;
                }
            })
        });
        $("#form-wrapper form").submit(function(e) {
            e.preventDefault();

            if ($("#id_name").val() === "potato?") {
                const potato_field_wrapper = $("#id_name").parents(".field-wrapper");
                that.addErrorNotes(potato_field_wrapper, ["<a href=\"https://www.youtube.com/watch?v=Qijju-y_NzI\">potato.</a>"], true);
                return;
            }
            if (utils.in_simulation || VIEWING_DELETED_ASSIGNMENTS) {
                let error_messages;
                if (utils.in_simulation) {
                    error_messages = ["You can't add or edit assignments in the simulation. This functionality is not yet supported :("];
                } else if (VIEWING_DELETED_ASSIGNMENTS) {
                    error_messages = ["You can't add or edit assignments in the deleted assignments view. Please restore this assignment first"];
                }
                const first_visible_field_wrapper = $("#form-wrapper form #first-field-group input:visible:first").parents(".field-wrapper");
                that.addErrorNotes(first_visible_field_wrapper, error_messages);
                return;
            }

            if (that.prevent_submission) return;

            // JSON fields are picky with their number inputs, convert them to standard form
            $("#id_works").val() && $("#id_works").val(+$("#id_works").val());
            
            const original_time_per_unit_disabled = $("#id_time_per_unit").attr("disabled");
            const original_funct_round_disabled = $("#id_funct_round").attr("disabled");
            $("#id_time_per_unit").removeAttr("disabled");
            $("#id_funct_round").removeAttr("disabled");
            const serialized = $(this).serialize();
            $("#id_time_per_unit").attr("disabled", original_time_per_unit_disabled);
            $("#id_funct_round").attr("disabled", original_funct_round_disabled);

            let original_sumbit_button_text = $("#submit-assignment-button").text();
            if (original_sumbit_button_text === "Submitting...")
                original_sumbit_button_text = undefined;
            $("#submit-assignment-button").text("Submitting...");
            that.prevent_submission = true;
            $.ajax({
                url: "/api/submit-assignment/",
                type: "POST",
                data: serialized + "&" + $.param({
                    utc_offset: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    id: that.sa_id,
                }),
                success: function(response) {
                    if (!response.valid) {
                        delete that.prevent_submission;
                        $(".invalid").removeClass("invalid");
                        that.removeErrorNotes($(".assignment-form-error-note"));
                        for (const [field_name, error_list] of Object.entries(response.errors)) {
                            const field_wrapper = $(`#id-${ field_name }-field-wrapper`);
                            that.addErrorNotes(field_wrapper, error_list);
                        }
                        return;
                    }
                    that.hideForm();
                    for (const sa of response.assignments) {
                        utils.initSA(sa);
                        if (response.edited_assignment) {
                            sa.just_edited = true;
                            if (response.refresh_dynamic_mode) {
                                sa.refresh_dynamic_mode = true;
                            }
                            // replace sa in dat with sa over here
                            dat[dat.findIndex(_sa => _sa.id === sa.id)] = sa;
                        } else {
                            sa.just_created = true;
                            dat.push(sa);
                        }
                    }
                    new Priority().sort();
                },
                fakeSuccessArguments: [
                    {
                        errors: {
                            name: [
                                "You can't create nor edit assignments in the example account"
                            ]
                        }
                    }
                ],
                error: ajaxUtils.error,
                complete: function() {
                    $("#submit-assignment-button").text(original_sumbit_button_text);
                    delete that.prevent_submission;
                }
            });
        });
        $("#next-page").click(function() {
            if ($(".assignment").length) {
                var everything_before = utils.loadAssignmentData($(".assignment").last()).deletion_time;
            } else {
                if (Crud.last_removed_deletion_time) {
                    var everything_before = Crud.last_removed_deletion_time;
                } else {
                    window.location.href = "/";
                }
            }
            everything_before = everything_before.valueOf() / 1000;
            const url = new URL(window.location.href);
            url.searchParams.set('everything_before', everything_before);
            url.searchParams.delete('everything_after');
            window.location.href = url.href;
        });
        $("#previous-page").click(function() {
            if ($(".assignment").length) {
                // i dont need to worry is .first() is actually the first assignment because of css order
                // because the assignments are ordered in the backend in the deleted assignments view
                var everything_after = utils.loadAssignmentData($(".assignment").first()).deletion_time;
            } else {
                if (Crud.last_removed_deletion_time) {
                    var everything_after = Crud.last_removed_deletion_time;
                } else {
                    window.location.href = "/";
                }
            }
            everything_after = everything_after.valueOf() / 1000;
            const url = new URL(window.location.href);
            url.searchParams.set('everything_after', everything_after);
            url.searchParams.delete('everything_before');
            window.location.href = url.href;
        });
    }
    static info(element, facing, position, text) {
        const info_button = $($("#info-button-template").html());
        info_button.find(".info-button-text").addClass(`info-${facing}`).text(text);
        info_button.on("mousedown", function(e) {
            if ($(document.activeElement).is(this)) { 
                // I have to do a settimeout because, I have no idea why, but on touch devices
                // an extra mouseout event is fired if you click the info button text container
                // AFTER the last mousedown event so the info button text doesn't hide properly
                setTimeout(() => $(this).blur().addClass("prevent-hover"), 0);
                e.preventDefault();
            } 
        }).on("mouseout", function(e) {
            const new_mouse_element = $(e.relatedTarget);
            if (new_mouse_element.is(".info-button") || new_mouse_element.parents(".info-button").length) return;
            $(this).removeClass("prevent-hover");
        // prevent soft due date from getting clicked
        }).click(() => false);
        switch (position) {
            case "prepend":
                return info_button.prependTo(element);
            case "after":
                return info_button.insertAfter(element);
            default:
                return info_button.appendTo(element);
        }
    }
    // Delete assignment
    static transitionDeleteAssignment($dom_assignment) {
        const ids = new Set();
        $dom_assignment.each(function(i) {
            const dom_assignment = $(this);
            const assignment_container = dom_assignment.parents(".assignment-container");
            const sa = utils.loadAssignmentData(dom_assignment);

            // Make overflow hidden because trying transitioning margin bottom off the screen still allows it to be scrolled to
            // $("#assignments-container").css("overflow", "hidden"); (unhide this in the callback if this is added back)
            // NOTE: removed because of bugginess and just looking bad overall
            function transition_callback() {
                assignment_container.remove();
                Crud.last_removed_deletion_time = sa.deletion_time;
                // If you don't include this, drawFixed in graph.js when $(window).trigger() is run is priority.js runs and causes an infinite loop because the canvas doesn't exist (because it was removed in the previous line)
                dom_assignment.removeClass("assignment-is-closing open-assignment");

                ids.add(sa.id);
                if (i === $dom_assignment.length - 1) {
                    // don't worry about losing the reference, .filter creates a shallow copy
                    dat = dat.filter(sa => !ids.has(sa.id));
                    // Although nothing needs to be swapped, new Priority().sort() still needs to be run to recolor and prioritize assignments and place shortcuts accordingly
                    new Priority().sort();
                }
            }
            
            const shortcut_deletion_animation_threshold = 15;
            if ($dom_assignment.length > shortcut_deletion_animation_threshold) {
                transition_callback();
                return;
            }
            // Opacity CSS transition
            dom_assignment.css({
                opacity: 0,
                zIndex: dom_assignment.css("z-index") - 2,
            });
            // Use css transitions because the animate property on assignment_container is reserved for other things in priority.js
            assignment_container.animate(
                {
                    // don't do outerHeight to ignore shortcut heights
                    marginBottom: -(dom_assignment.height() + parseFloat(assignment_container.css("padding-top")) + parseFloat(assignment_container.css("padding-bottom")))
                },
                750 * SETTINGS.animation_speed,
                "easeOutCubic",
                transition_callback
            );
        });
    }
    static deleteAssignment(dom_assignment, params={restore: false}) {
        if (dom_assignment.hasClass("assignment-is-deleting")) return;
        dom_assignment.addClass("assignment-is-deleting");
        // Send data to backend and animates its deletion
        const success = function() {
            Crud.transitionDeleteAssignment(dom_assignment);
        }
        const sa = utils.loadAssignmentData(dom_assignment);
        if (params.restore)
            $.ajax({
                type: "PATCH",
                url: "/api/restore-assignment",
                data: {assignments: JSON.stringify([sa.id])},
                success: success,
                fakeSuccessArguments: [],
                error: function() {
                    dom_assignment.removeClass("assignment-is-deleting");
                    ajaxUtils.error.bind(this)(...arguments);
                }
            });
        else
            // don't batch this so assignment-is-deleting is instantly removed
            $.ajax({
                type: "POST",
                url: "/api/delete-assignment",
                data: {assignments: JSON.stringify([sa.id]), actually_delete: VIEWING_DELETED_ASSIGNMENTS},
                success: success,
                fakeSuccessArguments: [],
                error: function() {
                    dom_assignment.removeClass("assignment-is-deleting");
                    ajaxUtils.error.bind(this)(...arguments);
                }
            });
    }
}
window.Crud = Crud;
$(window).one("load", function() {
    new Crud().init();
});