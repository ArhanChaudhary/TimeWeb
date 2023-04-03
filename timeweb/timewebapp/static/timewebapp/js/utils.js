window.utils = {
formatting: {
stringifyDate: function(date) {
    if (!date instanceof Date) return "";
    return [
        ('0' + (date.getMonth() + 1)).slice(-2),
        ('0' + date.getDate()).slice(-2),
        ('000' + date.getFullYear()).slice(-4),
    ].join('/');
},
formatMinutes: function(total_minutes, verbose=false) {
    const hour = Math.floor(total_minutes / 60),
        minute = Math.ceil(total_minutes % 60);
    if (verbose) {
        if (!hour) return (total_minutes && total_minutes < 1) ? "less than a minute" : minute + " minute" + (minute > 1 ? "s" : "");
        if (!minute) return hour + " hour" + (hour > 1 ? "s" : "");
        return hour + " hour" + (hour > 1 ? "s" : "") + " and " + minute + " minute" + (minute > 1 ? "s" : "");
    } else {
        if (!hour) return (total_minutes && total_minutes < 1) ? "<1m" : minute + "m";
        if (!minute) return hour + "h";
        return hour + "h " + minute + "m";
    }
},
formatSeconds: function(total_seconds) {
    // https://stackoverflow.com/questions/30679279/how-to-convert-seconds-into-year-month-days-hours-minutes-respectively
    let y = Math.floor(total_seconds / 31536000);
    let mo = Math.floor((total_seconds % 31536000) / 2628000);
    let d = Math.floor(((total_seconds % 31536000) % 2628000) / 86400);
    let h = Math.floor((total_seconds % (3600 * 24)) / 3600);
    let m = Math.floor((total_seconds % 3600) / 60);
    let s = Math.floor(total_seconds % 60);

    let yDisplay = y > 0 ? y + "y" : "";
    let moDisplay = mo > 0 ? mo + "mo" : "";
    let dDisplay = d > 0 ? d + "d" : "";
    let hDisplay = h > 0 ? h + "h" : "";
    let mDisplay = m > 0 ? m + "m" : "";
    let sDisplay = s > 0 ? s + "s" : "";
    let displays = [yDisplay, moDisplay, dDisplay, hDisplay, mDisplay, sDisplay];
    return displays.filter(d => d).slice(0, 2).join(" ");
},
// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
hexToRGB: function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    }
},
// https://www.geeksforgeeks.org/program-change-rgb-color-model-hsv-color-model/
rgbToHSV: function(r , g , b) {

    // R, G, B values are divided by 255
    // to change the range from 0..255 to 0..1
    r = r / 255.0;
    g = g / 255.0;
    b = b / 255.0;

    // h, s, v = hue, saturation, value
    var cmax = Math.max(r, Math.max(g, b)); // maximum of r, g, b
    var cmin = Math.min(r, Math.min(g, b)); // minimum of r, g, b
    var diff = cmax - cmin; // diff of cmax and cmin.
    var h = -1, s = -1;

    // if cmax and cmax are equal then h = 0
    if (cmax == cmin)
        h = 0;

    // if cmax equal r then compute h
    else if (cmax == r)
        h = (60 * ((g - b) / diff) + 360) % 360;

    // if cmax equal g then compute h
    else if (cmax == g)
        h = (60 * ((b - r) / diff) + 120) % 360;

    // if cmax equal b then compute h
    else if (cmax == b)
        h = (60 * ((r - g) / diff) + 240) % 360;

    // if cmax equal zero
    if (cmax == 0)
        s = 0;
    else
        s = (diff / cmax) * 100;

    // compute v
    var v = cmax * 100;
    return {h, s, v};
},
// https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
hsvToRGB: function(h, s, v) {
    h /= 360;
    s /= 100;
    v /= 100;

    var r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {r: r*255, g: g*255, b: b*255};
},
RGBToString(color, params={ invert: false }) {
    if (params.invert)
        return `rgb(
            ${255 - color.r},
            ${255 - color.g},
            ${255 - color.b}
        )`.replace(/\s+/g, '');
    else
        return `rgb(
            ${color.r},
            ${color.g},
            ${color.b}
        )`.replace(/\s+/g, '');
},
arrayToEnglish: function(array) {
    return `<ul><li>${array.join("</li><li>")}</li></ul>`;
},
getReversibilityStatus: function() {
    if (utils.in_simulation)
        return "You can restore your assignments in the simulation by refreshing.";
    else if (VIEWING_DELETED_ASSIGNMENTS)
        return "This action is irreversible.";  
    else
        return "You can view and restore your deleted assignments in the settings.";
},
},
ui: {
tickClock: function() {
    const now = utils.getRawDateNow({ dont_stem_off_date_now: true });
    if (utils.ui.tickClock.oldNow === undefined) {
        utils.ui.tickClock.oldNow = now;
    }
    const estimated_completion_time = new Date(now.valueOf());
    const minute_value = estimated_completion_time.getMinutes();

    estimated_completion_time.setMinutes(minute_value + +$("#estimated-total-time").attr("data-minutes"));
    if (isNaN(estimated_completion_time.getMinutes())) {
        estimated_completion_time.setTime(8640000000000000);
    }
    let str = estimated_completion_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // https://stackoverflow.com/questions/42879023/remove-leading-zeros-from-time-format
    str = str.replace(/^[0:]+(?=\d[\d:]{3})/,"");
    $("#estimated-completion-time").text(` (${str})`);
    if (!VIEWING_DELETED_ASSIGNMENTS &&
        // Don't tickClock in simulation or else Priority.sort calls tickClock which calls Priority.sort again
        // this messes up current_translate_value *= 0.9
        !utils.in_simulation) {
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        if (midnight.valueOf() !== date_now.valueOf()) {
            // Don't reload in the next day to preserve changes made in the simulation
            // Don't reload in the example account because date_now set in the example account causes an infinite reload loop  
            if (utils.in_simulation || isExampleAccount) return;
            reloadWhenAppropriate();
        }

        // We can't simply define a setTimeout until every assignment's due date. Here's why:
        // 1) Due dates can be changed if an assignment is soft, outdating the setTimeout
        // 2) setTimeouts may not run if a device is on sleep or powered off, considering there is only one opportunity for it to run
        let now_due_dates_passed = 0;
        for (let sa of dat) {
            let complete_due_date = new Date(sa.assignment_date.valueOf());
            complete_due_date.setDate(complete_due_date.getDate() + Math.floor(sa.complete_x));
            if (sa.due_time && (sa.due_time.hour || sa.due_time.minute)) {
                complete_due_date.setMinutes(complete_due_date.getMinutes() + sa.due_time.hour * 60 + sa.due_time.minute);
            }

            if (complete_due_date.valueOf() <= now.valueOf()) {
                now_due_dates_passed++;
            }
        }

        let old_now_due_dates_passed = 0;
        for (let sa of dat) {
            let complete_due_date = new Date(sa.assignment_date.valueOf());
            complete_due_date.setDate(complete_due_date.getDate() + Math.floor(sa.complete_x));
            if (sa.due_time && (sa.due_time.hour || sa.due_time.minute)) {
                complete_due_date.setMinutes(complete_due_date.getMinutes() + sa.due_time.hour * 60 + sa.due_time.minute);
            }

            if (complete_due_date.valueOf() <= utils.ui.tickClock.oldNow.valueOf()) {
                old_now_due_dates_passed++;
            }
        }
        utils.ui.tickClock.oldNow = now;

        if (old_now_due_dates_passed !== now_due_dates_passed) {
            new Priority().sort();
        }      
    }
},
setClickHandlers: {
    tickButtons: function() {
        $(".tick-button").parent().click(function() {
            const $this = $(this);
            const dom_assignment = $this.parents(".assignment");
            const sa = new VisualAssignment(dom_assignment);
            sa.setParabolaValues();

            // .sort is already called in the controls' click handlers
            if (!dom_assignment.hasClass("has-been-clicked")) {
                sa.initUI();
            }

            if (!dom_assignment.hasClass("open-assignment")) {
                dom_assignment.find(".falling-arrow-animation-instant")[0].beginElement();
            }
            let len_works = sa.sa.works.length - 1;
            let last_work_input = sa.sa.works[len_works];
            let todo = sa.funct(len_works + sa.sa.blue_line_start + 1) - last_work_input;
            const work_input_textbox_label = dom_assignment.find(".work-input-unit-of-time-checkbox");
            work_input_textbox_label.addClass("disable-conversion");
            todo = Math.max(0, todo);
            dom_assignment.find(".work-input-textbox").val(todo);
            dom_assignment.find(".submit-work-button").click();
            work_input_textbox_label.removeClass("disable-conversion");
        });
    },
    assignmentsHeaderUI: function() {
        $("#current-date").text(`Currently: ${date_now.toLocaleDateString([], {month: 'long', day: 'numeric', weekday: 'long'})}`);
        
        // Hide and show estimated completion time
        $("#hide-button").click(function() {
            if ($(this).text() === "Hide") {
                $(this).text("Show");
                $("#estimated-total-time, #estimated-completion-time, #important-total-time").addClass("hide-info");
                localStorage.setItem("hide-button", true);
            } else {
                $(this).text("Hide");
                $("#estimated-total-time, #estimated-completion-time, #important-total-time").removeClass("hide-info");
                localStorage.removeItem("hide-button");
            }
        });
        if ("hide-button" in localStorage) {
            $("#hide-button").click();
        }

        $("#go-to-next-day").click(function(e) {
            function changeDay() {
                utils.in_simulation = true;
                ajaxUtils.disable_ajax = true;
                date_now.setDate(date_now.getDate() + 1);
                // Hide current time without using display none, as that can be affected by .toggle
                $("#estimated-completion-time").css({
                    position: "absolute",
                    top: -9999,
                });
                $("#current-date").text("Simulated date: " + date_now.toLocaleDateString([], {month: 'long', day: 'numeric', weekday: 'long'}));
                new Priority().sort();
            }

            if (utils.in_simulation || e.shiftKey) {
                changeDay();
                return;
            }
            $.alert({
                title: `Are you sure you want to simulate all of your work for tomorrow?`,
                content: `NONE of the changes you make in the simulation are saved, and your assignments can be restored by refreshing this page.`,
                buttons: {
                    confirm: {
                        keys: ['Enter'],
                        action: changeDay,
                    },
                    cancel: function() {
                        
                    }
                },
            });

        });
        let raw_date_now = new Date();
        if (raw_date_now.getDate() - new Date(+localStorage.getItem("last_visit")).getDate() === 1 && raw_date_now.getHours() < 4) {
            // if it's been a day since the last visit and it's before 4am, remind them that the current date has changed
            // this alert is for fellow insomniacs who lose track of time
            $("#current-date-container").append("<span id=\"currently-has-changed-notice\">(has changed)</span>");
        }
        localStorage.setItem("last_visit", raw_date_now.valueOf());
    },

    assignmentSorting: function() {
        $("#id_assignment_sorting").on("change", function() {
            SETTINGS.assignment_sorting = $(this).val();
            ajaxUtils.changeSetting({setting: "assignment_sorting", value: SETTINGS.assignment_sorting});
            new Priority().sort();
        });
    },

    shortcuts: function() {
        const shortcuts = [
{
    selector: ".delete-starred-assignments .generic-button",
    // cannot use arrow function to preserve `this`
    confirmAction: function(params) {
        const assignment_ids_to_delete = params.assignments_in_wrapper.map(function() {
            return utils.loadAssignmentData($(this)).id;
        }).toArray();
        const success = function() {
            new Crud().transitionDeleteAssignment(params.assignments_in_wrapper);
        }
        $.ajax({
            type: "POST",
            url: "/api/delete-assignment",
            data: {assignments: JSON.stringify(assignment_ids_to_delete)},
            success: success,
            error: ajaxUtils.error,
        });
    },
    generateJConfirmParams: function(params) {
        return {
            title: `Are you sure you want to delete ${params.assignments_in_wrapper.length} completely finished ${pluralize("assignment", params.assignments_in_wrapper.length)}?`,
            content: utils.formatting.getReversibilityStatus(),
            buttons: {
                confirm: {
                    keys: ['Enter'],
                    action: () => this.confirmAction(params),
                },
                cancel: function() {
                    
                }
            },
        }
    },
},
{
    selector: ".delete-due-date-passed-assignments .generic-button",
    // the value of this doesn't matter
    confirmAction: params => shortcuts.find(s => s.selector === ".delete-starred-assignments .generic-button").confirmAction(params),
    generateJConfirmParams: params => ({
        ...shortcuts.find(s => s.selector === ".delete-starred-assignments .generic-button").generateJConfirmParams(params),
        title: `Are you sure you want to delete ${params.assignments_in_wrapper.length} past due ${pluralize("assignment", params.assignments_in_wrapper.length)}?`,
    }),
},
{
    selector: ".autofill-work-done .generic-button:not(select)",
    confirmAction: function(params) {
        const params2 = {};
        params2[`autofill_${$("#autofill-selection").val().toLowerCase()}_work_done`] = params.assignments_in_wrapper;
        new Priority().sort(params2);
    },
    generateJConfirmParams: function(params) {
        return {
            title: `Are you sure you want to autoinput ${$("#autofill-selection").val().toLowerCase()} work done for ${params.assignments_in_wrapper.length} ${pluralize("assignment", params.assignments_in_wrapper.length)}?`,
            content: (function() {
                switch ($("#autofill-selection").val()) {
                    case "No":
                        return "Assumes you haven't done anything since your last work input and autoinputs in no work done until today";
                    case "All":
                        return "Assumes you followed your work schedule since your last work input and autoinputs in all work done until today";
                }
            })(),
            buttons: {
                confirm: {
                    keys: ['Enter'],
                    action: () => this.confirmAction(params),
                },
                cancel: function() {
                    
                }
            }
        }
    },
},
{
    selector: ".delete-gc-assignments-from-class .generic-button",
    confirmAction: function(params) {
        const success = function() {
            params.$this.off("click");
            new Crud().transitionDeleteAssignment(params.assignments_in_wrapper);
        }
        const assignment_ids_to_delete = params.assignments_in_wrapper.map(function() {
            return utils.loadAssignmentData($(this)).id;
        }).toArray();
        $.ajax({
            type: "POST",
            url: "/api/delete-assignment",
            data: {assignments: JSON.stringify(assignment_ids_to_delete)},
            success: success,
            error: ajaxUtils.error,
        });
    },
    generateJConfirmParams: function(params) {
        return {
            title: `Are you sure you want to delete ${params.assignments_in_wrapper.length} ${pluralize("assignment", params.assignments_in_wrapper.length)} from class "${utils.loadAssignmentData(params.assignment_container.children(".assignment")).tags[0]}"?<br>(A Google Classroom assignment's first tag is considered its class name)`,
            content: utils.formatting.getReversibilityStatus(),
            buttons: {
                confirm: {
                    keys: ['Enter'],
                    action: () => this.confirmAction(params),
                },
                cancel: function() {
                    
                }
            }
        }
    }
}
        ];

        $(document).click(function(e) {
            let $this = $(e.target);
            const shortcut = shortcuts.find(s => $this.is(s.selector));
            if (!shortcut) return;

            const assignment_container = $this.parents(".assignment-container");
            const assignments_in_wrapper = utils.inLineWrapperQuery(assignment_container).children(".assignment");
            if (e.shiftKey)
                shortcut.confirmAction({assignments_in_wrapper, $this});
            else
                $.confirm(shortcut.generateJConfirmParams({assignments_in_wrapper, assignment_container, $this}));
        });
    },
},
addTagHandlers: function() {
    function transitionCloseTagBox($tag_add) {
        const tag_add_box = $tag_add.find(".tag-add-box");

        tag_add_box.css({
            height: "unset",
            overflow: "visible",
        });

        tag_add_box.one("transitionend", function() {
            tag_add_box.css({
                height: "",
                overflow: "",
            });
            tag_add_box.find(".tag-add-selection-item").remove();
            tag_add_box.find(".tag-add-button").removeAttr("tabindex");
            tag_add_box.find(".tag-add-input").attr("tabindex", "-1");
        });
    }
    // TODO: might be easier to attach the click to $(document) but will do later
    $(".tag-add").click(tagAddClick);
    let tag_names = new Set();
    function tagAddClick(e) {
        const $this = $(this);
        const dom_assignment = $this.parents(".assignment");
        // Close add tag box if "Add Tag" is clicked again
        if (($(e.target).hasClass("tag-add") || $(e.target).parent(".tag-add").length) && dom_assignment.hasClass("open-tag-add-box")) {
            dom_assignment.removeClass("open-tag-add-box");
            transitionCloseTagBox($this);
            return;
        }
        // Plus button was clicked
        if ($(e.target).is(".tag-add-button, .tag-add-button > .icon-slash")) {
            const sa = utils.loadAssignmentData($this);

            const checked_tag_names = $this.find(".tag-add-selection-item.checked .tag-add-selection-item-name").map(function() {
                return $(this).text();
            }).toArray();
            // Push all checked tag names not already in tag_names to tag_names
            checked_tag_names.forEach(tag_names.add, tag_names);
            
            const inputted_tag_name = $this.find(".tag-add-input").val().trim();
            if (inputted_tag_name && inputted_tag_name !== "Too Many Tags!" && !tag_names.has(inputted_tag_name)) {
                tag_names.add(inputted_tag_name);
            }
            // Nothing is checked or inputted
            if (!tag_names.size) {
                if (utils.ui.close_on_success) {
                    utils.ui.close_on_success = false;
                    $this.find(".tag-add-input").blur();
                }
                return;
            }
            tag_names = new Set([...tag_names].filter(tag_name => !sa.tags.includes(tag_name)));

            if (sa.tags.length + tag_names.size > MAX_NUMBER_OF_TAGS) {
                $(this).find(".tag-add-button").addClass("tag-add-red-box-shadow");
                $(this).find(".tag-add-input").val("Too Many Tags!");
                tag_names = new Set();
                return;
            }

            if (utils.ui.close_on_success) {
                utils.ui.close_on_success = false;
                $this.find(".tag-add-input").blur();
            }
            // Close box and add tags visually
            dom_assignment.removeClass("open-tag-add-box");
            transitionCloseTagBox($this);
            for (let tag_name of tag_names) {
                const tag = $($("#tag-template").html());
                tag.find(".tag-name").text(tag_name);
                tag.find(".tag-delete").click(tagDelete).attr("data-tag-deletion-name", tag_name).attr("data-assignment-id", sa.id);
                tag.appendTo($this.parents(".tags").find(".tag-sortable-container"));

                tag.addClass("tag-add-transition-disabler");
                // Need to use jquery instead of css to set marginLeft
                tag.css({
                    marginLeft: -tag.outerWidth(true),
                    opacity: "0",
                    transform: "scale(0.6)",
                });
                tag[0].offsetHeight;
                tag.removeClass("tag-add-transition-disabler");
                tag.css({
                    marginLeft: "",
                    opacity: "",
                    transform: "",
                });

                tag.prev().css("z-index", "1");
                tag.one("transitionend", function() {
                    tag.prev().css("z-index", "");
                });
            }            
            if (!tag_names.size) return;
            sa.tags.push(...tag_names);
            ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {tags: sa.tags, id: sa.id});
            // There are too many conditions on whether to sort or not, so just sort every time

            // sa.needs_more info for GC class tags or for first_tag sorting for non GC assignments
            // "important" and "not important" because they were designed to affect priority
            // if (sa.needs_more_info || tag_names.has("Important") || tag_names.has("Not Important")) {
                new Priority().sort();
            // }
            tag_names = new Set();
            return;
        }
        // Tag add textbox was selected or tags were selected
        if (dom_assignment.hasClass("open-tag-add-box")) return;
        dom_assignment.addClass("open-tag-add-box");
        $this.find(".tag-add-button").removeClass("tag-add-red-box-shadow").attr("tabindex", "0");
        $this.find(".tag-add-input").val("").attr("tabindex", "");
        const container_for_tags = $this.find(".tag-add-overflow-hidden-container");

        // This code handles the logic for determining which tags should be added to the tag add dropdown. Let's break this down:

        // Push every tag from every assignment
        let allTags = [];
        dat.forEach(sa => allTags.push(...sa.tags));
        // Filter out duplicate tags
        let unique_allTags = new Set(allTags);
        // Remove "Important" and "Not Important" so they can be added first
        unique_allTags.delete("Important");
        unique_allTags.delete("Not Important");
        // Filter out default dropdown tags so is in a separate sorting group
        let current_assignment_tags = utils.loadAssignmentData(dom_assignment).tags;
        unique_allTags = [...unique_allTags].filter(e => !SETTINGS.default_dropdown_tags.includes(e));

        let final_allTags = [];
        // Add back in "Important", "Not Important"
        final_allTags.push("Important");
        final_allTags.push("Not Important");
        // And default_dropdown_tags
        final_allTags.push(...SETTINGS.default_dropdown_tags);
        // Finally, add sorted unique_allTags
        final_allTags.push(...unique_allTags.sort());
        // Filter out tags that are already in the assignment
        final_allTags = final_allTags.filter(e => !current_assignment_tags.includes(e));
        if (!isTouchDevice || !final_allTags.length) {
            // showing the entire keyboard when you want to add tags can get annoying on mobile
            $this.find(".tag-add-input").focus();
        }



        // The tag add box can be reopened while the transitionend from the transitionCloseTagBox function hasn't yet fired, causing all the tags to disppear
        // Trigger the transitionend if this is the case, and since transitionCloseTagAddBox uses .one, it will be disabled after
        const tag_add_box = $this.find(".tag-add-box");
        tag_add_box.trigger("transitionend");

        for (let tag of final_allTags) {
            const tag_add_selection_item = $($("#tag-add-selection-item-template").html());
            tag_add_selection_item.find(".tag-add-selection-item-name").first().text(tag);
            container_for_tags.append(tag_add_selection_item);
            tag_add_selection_item.click(function() {
                $(this).find(".tag-add-checkbox").prop("checked", !$(this).hasClass("checked"));
                $(this).toggleClass("checked");
            });
        }
        
    }
    $(".tag-delete").click(tagDelete);
    function tagDelete() {
        const $this = $(this);
        const tag_wrapper = $this.parents(".tag-wrapper");
        if (tag_wrapper.hasClass("tag-is-deleting")) return;
        tag_wrapper.addClass("keep-delete-open");
        
        const sa = utils.loadAssignmentData($this);
        const tag_name_to_delete = [$this.attr("data-tag-deletion-name")];
        // Remove data locally from dat
        sa.tags = sa.tags.filter(tag_name => !tag_name_to_delete.includes(tag_name));

        // There are too many conditions on whether to sort or not, so just sort every time

        // GC class tags
        // if (sa.is_google_classroom_assignment && sa.needs_more_info || tag_name_to_delete.includes("Important") || tag_name_to_delete.includes("Not Important")) {
            new Priority().sort();
        // }

        tag_wrapper.addClass("tag-is-deleting");
        // Transition the deletion
        // Need to use jquery to set css for marginLeft
        tag_wrapper.css({
            marginLeft: -tag_wrapper.outerWidth(true),
            opacity: "0",
            transform: "scale(0.6)",
        });
        tag_wrapper.prev().css("z-index", "1");
        tag_wrapper.one("transitionend", function() {
            tag_wrapper.prev().css("z-index", "");
            tag_wrapper.remove();
        });
        $this.parents(".tags").find(".tag-add-button").removeClass("tag-add-red-box-shadow");
        ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {tags: sa.tags, id: sa.id});
    }
    $(".tag-add").focusout(function() {
        const $this = $(this);
        const dom_assignment = $this.parents(".assignment");
        setTimeout(function() {
            // const tag_add_text_clicked = $(e.currentTarget).is($this) && $(document.activeElement).hasClass("assignment");

            // If the user unfocuses the closed tag modal which they previously clicked to close, this will run and add the transitionend event in transitionCloseTagBox to the already closed tag-add-box, which is unwanted and causes bugs
            // I can't just do !$(e.target).is($this) because the tag modal may already be open without the user already previously clicking .tag-add to close it, and the transitionend event is needed in this case
            // So, only return when the tag modal is closed by adding || $this.find(".tag-add-box").css("height") === 0
            if ($(document.activeElement).parents(".tag-add").length || $(document.activeElement).is($this) || parseFloat($this.find(".tag-add-box").css("height")) === 0) return;
            dom_assignment.removeClass("open-tag-add-box");
            transitionCloseTagBox($this);
        }, 0);
    });
    $(".tag-sortable-container").sortable({
        animation: 150,
        // some mobile phones consider a tap to be a drag,
        // preventing tag deletion
        delay: 200,
        delayOnTouchOnly: true,

        ghostClass: "ghost",
        direction: "horizontal",
        onMove: function(e) {
            // If the tag is dragged while it's being deleted, it won't be deleted by the above code but it will instead be re-added in its final styles back into .tag-sortable-container
            // Prevent that from happening
            return !$(e.dragged).hasClass("tag-is-deleting");
        },
        onEnd: function() {
            const $this = $(this.el);
            const sa = utils.loadAssignmentData($this);
            sa.tags = $this.find(".tag-wrapper").filter(function() {
                // Also remove z-index if it wasnt reset back to none from dragging the tag around
                return !$(this).css("z-index","").hasClass("tag-is-deleting");
            }).map(function() {
                return $(this).find(".tag-name").text();
            }).toArray();

            // There are too many conditions on whether to sort or not, so just sort every time

            // GC class tags
            //sa.is_google_classroom_assignment && sa.needs_more_info && 
            new Priority().sort();
            ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, {tags: sa.tags, id: sa.id});
        }
    });
},
setKeybinds: function() {
$(document).keydown(function(e) {
// it's important to not modify e.key because then the event object itself will be modified
const e_key = e.key.toLowerCase();
if (e.ctrlKey || e.metaKey
    || VIEWING_DELETED_ASSIGNMENTS && ["backspace", "s", "f", "n"].includes(e_key)
    || e.originalEvent.repeat && ["backspace", "s", "f", "0"].includes(e_key)) return;
const form_is_showing = $("#overlay").is(":visible");
const form_is_hidden = !form_is_showing;
switch (e_key) {
    case "n":
    case "e":
    case "d":
    case "r":
    case "backspace":
    case "s":
    case "f":
    case "0":
    case "o":
    case "c":
    case "t":
        if (!["input", "textarea"].includes($(document.activeElement).prop("tagName").toLowerCase()))
        switch (e_key) {
            case "n":
                if (form_is_showing) return;
                $("#image-new-container").click();
                break;
            case "t":
                $("#assignments-container").scrollTop(0);
                break;
            case "e":
            case "d":
            case "r":
            case "backspace":
            case "s":
            case "f":
            case "0":
            case "o":
            case "c":
                let assignment_container = $(":hover").filter(".assignment-container");
                if (!assignment_container.length) assignment_container = $(document.activeElement).parents(".assignment-container");
                let dom_assignment = assignment_container.children(".assignment");
                if (assignment_container.length) {
                    if (!dom_assignment.hasClass("has-been-clicked")) {
                        new VisualAssignment(dom_assignment).initUI();
                    }
                    switch (e_key) {
                        case "o":
                        case "c":
                            dom_assignment.click();
                            break;
                        case "e":
                            if (form_is_showing) return;
                            assignment_container.find(".update-button").parents(".assignment-header-button").focus().click();
                            break;
                        case "d": {
                            const click_delete_button = $.Event("click");
                            click_delete_button.shiftKey = e.shiftKey;
                            assignment_container.find(".delete-button").parents(".assignment-header-button").focus().trigger(click_delete_button);
                            break;
                        }
                        case "r":
                            assignment_container.find(".restore-button").parents(".assignment-header-button").focus().click();
                            break;
                        case "f":
                            assignment_container.find(".tick-button").is(":visible") && assignment_container.find(".tick-button").parents(".assignment-header-button").focus().click();
                            break;
                        case "0":
                            if (!dom_assignment.hasClass("open-assignment")) {
                                dom_assignment.find(".falling-arrow-animation-instant")[0].beginElement()
                            }
                            dom_assignment.find(".work-input-textbox").val("0");
                            dom_assignment.find(".submit-work-button").click();
                            break;
                        case "backspace":
                        case "s":
                            // I would animate the arrow for backspace too but 
                            // that only works when an assignment is open
                            if (dom_assignment.hasClass("open-assignment")) {
                            switch (e_key) {
                                case "backspace":
                                    var graph_button = assignment_container.find(".delete-work-input-button");
                                    break;
                                case "s":
                                    var graph_button = assignment_container.find(".skew-ratio-button");
                                    break;
                            }
                            // We can't use a normal .click().focus() or else
                            // a graph button out of view scrolls it all the way to the middle of the page
                            graph_button.click();
                            // scroll AFTER it is clicked, the click even may call Priority.sort and further
                            // alter the position of the graph button
                            graph_button[0].scrollIntoView({block: "nearest"});
                            setTimeout(() => graph_button.focus(), 0);
                            }
                            break;
                    }
                    break;
                }
        }
        break;
    case "escape":
        // doesn't work on daterangepicker inputs because DateRangePicker.prototype.keydown prevents default the event
        new Crud().hideForm();
        break;
    case "arrowdown":
    case "arrowup":
        if (["textarea"].includes($(document.activeElement).prop("tagName").toLowerCase())) return;
        const open_assignments_on_screen = $(".open-assignment").map(function() {
            const sa = new VisualAssignment($(this));
            return sa.assignmentGraphIsOnScreen() ? sa : null;
        }).toArray();
        if (open_assignments_on_screen.length !== 0) {
            // Prevent arrow scroll
            e.preventDefault();
            for (const sa of open_assignments_on_screen) {
                sa.setParabolaValues();
                sa.arrowSkewRatio(e.key);
            }
        } else {
            // Allow arrow scroll
            // Relies on the fact that #assignments-container is the scrolling element
            $("#assignments-container").focus();
        }
        break;
    }
    });
    $(".tag-add-input").keydown(function(e) {
        if (e.key === "Enter") {
            utils.ui.close_on_success = true;
            $(this).parents(".tags").find(".tag-add-button").click();
        }
    });
},
displayFullDueDateOnHover: function() {
    $(".title").on("mouseover mousemove click", function(e) {
        $(this).toggleClass("show-long-daysleft", e.offsetY > $(this).height());
        // could probably validate with touchstart event instead of isTouchDevice
        if (isTouchDevice && e.offsetY > $(this).height()) return false;
    }).on("mouseout", function() {
        $(this).removeClass("show-long-daysleft");
    });
},
setAssignmentScaleUtils: function() {
    // width * percentx = width+10
    // percentx = 1 + 10/width
    $(window).resize(function() {
        $("#assignments-container").css('--scale-percent-x',`${1 + 10/$(".assignment").first().width()}`);
        $(".assignment").each(function() {
            const $this = $(this);
            const sa = new VisualAssignment($this);
            sa.positionTags();
            sa.displayTruncateWarning();
            sa.makeGCAnchorVisible();
        });
    });
    // #animate-in is initially display: hidden in priority.js, delay adding the scale
    document.fonts.ready.then(function() {
        setTimeout(function() {
            // height * percenty = height+5
            // percenty = 1 + 5/height
            $("#assignments-container").css('--scale-percent-x',`${1 + 10/$(".assignment").first().width()}`);
            $(".assignment").each(function() {
                if (1 + 10/$(this).height() > 1.05) return;
                $(this).css('--scale-percent-y',`${1 + 10/$(this).height()}`);
            });
        }, 0);
    });
},
setAnimationSpeed: function() {
    $("main").css('--animation-speed', SETTINGS.animation_speed);
    if (SETTINGS.animation_speed !== 0) return;

    $(".assignment").each(function() {
        this.style.setProperty('--scale-percent-x', '1', 'important');
        this.style.setProperty('--scale-percent-y', '1', 'important');
    });
},
tutorial: function(first_available_assignment) {
    $("#tutorial-click-assignment-to-open").remove();
    if (!SETTINGS.enable_tutorial || VIEWING_DELETED_ASSIGNMENTS) return;

    first_available_assignment.after($("#tutorial-click-assignment-to-open-template").html());

    const tutorial_alerts = [
        {
            title: $("#tutorial-animation-template").html(),
            content: "TimeWeb is a time management application that visualizes, quantifies, and prioritizes your daily school or work assignments. Here's a demonstration of how it works.",
            backgroundDismiss: false,
            buttons: {
                "Skip tutorial": {
                    action: function() {
                        this.break = true;
                        SETTINGS.enable_tutorial = false;
                        // ajaxUtils.changeSetting({setting: "enable_tutorial", value: SETTINGS.enable_tutorial});
                    }
                },
                next: {
                    action: function() {
    
                    }
                }
            },
        },
        {
            title: "Welcome to the graph, a visualization of your assignment's entire work schedule. It is highly recommended to read the graph's section on TimeWeb's <a href=\"/user-guide#what-is-the-assignment-graph\" target=\"_blank\">user guide</a> to understand how to use it." + (isExampleAccount ? "" : "<br><br>Once you're finished, check out the settings to set your preferences."),
            content: "Check out your example assignment or the <a href=\"/example\">example account</a> to see how TimeWeb handles longer and more complicated assignments.",
            backgroundDismiss: false,
            alignTop: true, // alignTop is a custom extension
            onDestroy: function() {

            },
            transition: function(finished_resolver) {
                first_available_assignment[0].scrollIntoView({behavior: 'smooth', block: 'nearest'});
                new Promise(function(resolve) {
                    let scrollTimeout = setTimeout(resolve, 500);
                    $("#assignments-container").scroll(() => {
                        clearTimeout(scrollTimeout);
                        scrollTimeout = setTimeout(resolve, 500);
                    });
                }).then(function() {
                    $("#assignments-container").off('scroll');
                    first_available_assignment.click();
                    setTimeout(finished_resolver, 1000);
                });
            },
        },
    ];
    function recurseAlert(alertparams) {
        if (!alertparams.length) return;

        const alertparam = alertparams.shift();
        alertparam.backgroundDismiss = false;
        alertparam.onClose = function() {
            if (this.break) return;
            recurseAlert(alertparams);
        }
        new Promise(function(finished_resolver) {
            if (alertparam.transition)
                alertparam.transition(finished_resolver);
            else
                finished_resolver();
        }).then(function() {
            $.alert(alertparam);
        });
    }
    recurseAlert(tutorial_alerts);
},
exampleAccountAlertTutorial: function() {
    if (sessionStorage.getItem("already-alerted-example-account")) return;
    sessionStorage.setItem("already-alerted-example-account", true);
    $.alert({
        title: "Hey there! Thanks for checking out the example account. Here, you'll get a clear perspective of how you should expect TimeWeb to look like<br><br>Feel free to look around or make any changes you want to any assignment.",
        backgroundDismiss: false,
    });
},
saveAndLoadStates: function() {



    // IMPORTANT!
    // Make sure to reset storages appropriately in timewebauth/static/js/timewebauth/login.js



    // Saves current open assignments and scroll position to localstorage and sessionstorage if refreshed or redirected
    // Use beforeunload instead of unload or else the loading screen triggers and $("#assignments-container").scrollTop() becomes 0
    $(window).on('beforeunload', function() {
        sessionStorage.setItem("login_email", ACCOUNT_EMAIL);
        if (!(SETTINGS.enable_tutorial || VIEWING_DELETED_ASSIGNMENTS)) {
            // Save current open assignments
            sessionStorage.setItem("open_assignments", JSON.stringify(
                $(".assignment.open-assignment").map(function() {
                    return $(this).attr("data-assignment-id")
                }).toArray()
            ));
            // Save scroll position
            sessionStorage.setItem("scroll", $("#assignments-container").scrollTop());
        }
        let block = false;
        // Send all queued ajax requests
        for (let batchCallbackName of Object.keys(ajaxUtils.batchRequest)) {
            block = true;
            if (batchCallbackName.endsWith("_callback")) {

            } else if (batchCallbackName.endsWith("_timeout"))
                clearTimeout(ajaxUtils.batchRequest[batchCallbackName + "_timeout"]);
            else if (ajaxUtils.batchRequest[batchCallbackName].length)
                ajaxUtils.sendBatchRequest(batchCallbackName, ajaxUtils.batchRequest[batchCallbackName + "_callback"]);
        }
        if (block) {
            window.disable_loading = true;
            setTimeout(function() {
                window.disable_loading = false;
            }, 0);
            return true;
        }
    });

    // Ensure fonts load for the graph
    document.fonts.ready.then(function() {
        if (SETTINGS.enable_tutorial || VIEWING_DELETED_ASSIGNMENTS) return;
        // setTimeout so the assignments are clicked after the click handlers are set
        setTimeout(function() {
            // Reopen closed assignments
            if ("open_assignments" in sessionStorage) {
                const open_assignments = JSON.parse(sessionStorage.getItem("open_assignments"));
                $(".assignment").each(function() {
                    const was_open = open_assignments.includes($(this).attr("data-assignment-id"));
                    if (!was_open) return;

                    // if you edit an open assignment and make it needs more info
                    // ensure it isn't clicked
                    const dom_assignment = $(this);
                    const sa = new VisualAssignment(dom_assignment);
                    if (sa.canOpenAssignment()) {
                        dom_assignment.click();
                    }
                });
            }

            // Scroll to original position
            // Needs to scroll after assignments are opened
            if ("scroll" in sessionStorage) {
                $("#assignments-container").scrollTop(sessionStorage.getItem("scroll"));
            }
        }, 0);
    });
},
navClickHandlers: function() {
    $("#nav-credits").click(() => $.alert({
        title: $("#credits-template").html(),
    }));

    const special_thanks_alerts = [
        {
            title: "Special thanks to Kevin Chu",
            content: `for easily being the most influential and open-minded suggester throughout the entirety of TimeWeb's development, participating
                    in over fifty suggestion threads and solely being responsible for many of TimeWeb's major user interface improvements and so much
                    more.`,
        },
        {
            title: "Special thanks to Stanley Ho",
            content: `for being a consistent and dedicated suggester and for being the only one to use TimeWeb almost daily throughout the 
                    entirety of its beta and alpha phases.`,
        },
        {
            title: "Special thanks to Jeffery Zhang",
            content: `for being one of my best friends through all of high school and for having the patience, interest, and intelligence to pioneer a core part of TimeWeb's <a href="
                    https://github.com/ArhanChaudhary/TimeWeb/issues/3" target="_blank">curvature autotuning regression algorithm</a>.`,
        },
        {
            title: "Special thanks to Ansh Bhatagnar",
            content: `for carrying my sanity during history and math class and for being the most fun idiot to joke around and talk to. For also carrying my
                    motivation over many study voice calls.`,
        },
        {
            title: "Special thanks to Adrian Zhang",
            content: `for being the coolest coder friend to relate and talk to and for somehow not going insane from listening to all of my ramblings
                    about school and life.`,
        },
        
        {
            title: "Special thanks to Vikram Srinivasan",
            content: `for being a reliable advisor for many of TimeWeb's core designs and functionalities, such as the initial draft of the
                    v1.8.0 user interface redesign, and for being an active and playful member of TimeWeb's community. Special thanks to his
                    phone, too, for being a constant victim to my testing.`,
        },
        {
            title: "Special thanks to Rohan \"Baguette\" Bhagat",
            content: `for being really annoying and teaching me the value of patience !1!! 😊 😊 (no but seriously for being someone I've known since middle school and can feel comfortable talking and relating to about anything.`,
        },
        {
            title: "Special thanks to Charles P.",
            content: `for designing TimeWeb's <a href="/favicon.ico">favicon</a>.`,
        },
        {
            title: "Special thanks to Rishi Jani",
            content: `for being someone genuine to talk to during 2020 and for continuing to support me all the way from the creation of TimeWeb in its
                    pre-alpha to today and onwards.`,
        },
        {
            title: "Special thanks to Abhik Mullick",
            content: `for being courageous enough to provide constructive and real criticism and for being the most kind and comforting person to hang
                    out with.`,
        },
        {
            title: "Special thanks to Shantanu Bulbule",
            content: `for creating the legendary <a href="https://imgur.com/a/OPU1Xcd" target="_blank">TIMEWEB CAR</a> :D.`,
        },
        {
            title: "Special thanks to Andrew Sun",
            content: `om g andrew mega suS (!!) +gets 100 we,b coin .`,
        },
        {
            title: "And most importantly, my mom and my dad <3",
        },
    ];

    function recurseAlert(alertparams, total_length) {
        if (!alertparams.length) return;

        const alertparam = alertparams.shift();
        alertparam.onClose = function() {
            recurseAlert(alertparams, total_length);
        };
        alertparam.title += ` (${total_length - alertparams.length}/${total_length})`;
        $.alert(alertparam);
    }
    // most importantly my mom is and dad
    $("#nav-special-thanks").click(() => {
        // lets not modify the original so it can be used again
        // deepcopy because recurseAlert modifies alertparam
        const special_thanks_alerts_copy = JSON.parse(JSON.stringify(special_thanks_alerts));
        $.alert({
            title: "Creating TimeWeb hasn't been easy. I couldn't have done it without the emotional and mental support of some of my closest friends:",
            buttons: {
                escape: function() {
                    
                },
                ok: {
                    keys: ['Enter'],
                    action: function() {
                        recurseAlert(special_thanks_alerts_copy, special_thanks_alerts.length);
                    }
                },
            }
        })
    });

}
},
loadAssignmentData: function($element_with_id_attribute, directly_is_pk=false) {
    if (directly_is_pk) return dat.find(assignment => assignment.id == $element_with_id_attribute);
    return dat.find(assignment => assignment.id == $element_with_id_attribute.attr("data-assignment-id"));
},
getRawDateNow: function(params={ dont_stem_off_date_now: false }) {
    const raw_date_now = new Date();
    if (!params.dont_stem_off_date_now) {
        let complete_date_now = new Date(date_now.valueOf());
        if (utils.in_simulation) {
            // lock simulation date to 12:00 AM to prevent assignments with due times from being completed
            complete_date_now.setHours(0, 0, 0, 0);
        } else {
            // precision up to seconds or else deleted assignments view sometimes displays a 
            // negative "deleted ago" date
            complete_date_now.setHours(raw_date_now.getHours(), raw_date_now.getMinutes(), raw_date_now.getSeconds(), 0);
        }
        return complete_date_now;
    } else {
        return raw_date_now;
    }
},
flexboxOrderQuery: $query => $($($query).toArray().sort((a, b) => {
    // we cannot fill in the indexes of an array with $query.length
    // because it isn't guaranteed order numbers will be consecutive
    // (for example such as when assignments are deleted)
    const a_order = +$(a).css("order");
    const b_order = +$(b).css("order");
    if (a_order == b_order) return 0;
    if (a_order > b_order) return 1;
    if (a_order < b_order) return -1;
})),
inLineWrapperQuery: function($first_assignment_container) {
    let in_wrapper = false;
    let ret = $();
    utils.flexboxOrderQuery(".assignment-container").each(function() {
        if ($(this).is($first_assignment_container)) {
            in_wrapper = true;
        }
        if (in_wrapper) {
            ret = ret.add(this);
            if ($(this).hasClass("last-add-line-wrapper")) {
                return false; // break
            }
        }
    });
    return ret;
},
}

window.SETTINGS = JSON.parse(document.getElementById("settings-model").textContent);
SETTINGS.animation_speed = +SETTINGS.animation_speed;
if (!SETTINGS.seen_latest_changelog) {
    latest_changelog = JSON.parse(document.getElementById("latest-changelog").textContent);
    setTimeout(function() {
        const update_wrapper = document.createElement("ul");
        for (const update of latest_changelog.updates) {
            const li = document.createElement("li");
            li.innerHTML = update;
            update_wrapper.appendChild(li);
        }
        const bugfixes_wrapper = document.createElement("ul");
        for (const bugfix of latest_changelog.bugfixes) {
            const li = document.createElement("li");
            li.innerHTML = bugfix;
            bugfixes_wrapper.appendChild(li);
        }
        update_wrapper.appendChild(bugfixes_wrapper);
        const jconfirm = $.alert({
            title: `Hey there! A new update is here :D!<br><br>${latest_changelog.version} (${latest_changelog.date})`,
            content: update_wrapper.outerHTML + "This can also be viewed on TimeWeb's <a href=\"/changelog\">changelog</a>.",
            backgroundDismiss: false,
            onClose: function() {
                SETTINGS.seen_latest_changelog = true;
                ajaxUtils.changeSetting({setting: "seen_latest_changelog", value: SETTINGS.seen_latest_changelog});
            }
        });
        setTimeout(function() {
            jconfirm.$content.prop("style").setProperty("opacity", "0.85", "important");
            jconfirm.$titleContainer.css("padding-bottom", 5);
        }, 0);
    }, 500);
}
SETTINGS.def_break_days = SETTINGS.def_break_days.map(Number);
window.date_now = new Date(utils.getRawDateNow({ dont_stem_off_date_now: true }).toDateString());
SETTINGS.highest_priority_color = utils.formatting.hexToRGB(SETTINGS.highest_priority_color);
SETTINGS.lowest_priority_color = utils.formatting.hexToRGB(SETTINGS.lowest_priority_color);
if (isExampleAccount) {
    x_transform = mathUtils.daysBetweenTwoDates(date_now, new Date(2021, 4, 3));
}
// Load in assignment data
window.dat = JSON.parse(document.getElementById("assignment-models").textContent);
for (let sa of dat) {
    if (sa.assignment_date) {
        sa.assignment_date = new Date(sa.assignment_date);
        // NOTE: compare all dates in the front end in the user's time zone
        // the Date object is always in the user's time zone, making it
        // far easier to do it this way
        // assignment_date and x are in utc, so we need to convert them
        // Reference: https://stackoverflow.com/questions/15141762/how-to-initialize-a-javascript-date-to-a-particular-time-zone
        sa.assignment_date = new Date(sa.assignment_date
            .getUTCFullYear(), sa.assignment_date
            .getUTCMonth(), sa.assignment_date
            .getUTCDate(), sa.assignment_date
            .getUTCHours(), sa.assignment_date
            .getUTCMinutes(), sa.assignment_date
            .getUTCSeconds(), sa.assignment_date
            .getUTCMilliseconds());
    } else {
        sa.assignment_date = new Date(date_now.valueOf());
        sa.fake_assignment_date = true;
    }

    if (sa.due_time) {
        sa.due_time = sa.due_time.split(":");
        sa.due_time = {
            hour: +sa.due_time[0],

            minute: +sa.due_time[1],
        }
    }
    // Don't do Number.isFinite(x) because this is the raw value
    if (sa.x) {
        sa.x = new Date(sa.x);
        sa.x = new Date(sa.x
            .getUTCFullYear(), sa.x
            .getUTCMonth(), sa.x
            .getUTCDate(), sa.x
            .getUTCHours(), sa.x
            .getUTCMinutes(), sa.x
            .getUTCSeconds(), sa.x
            .getUTCMilliseconds());
        if (sa.due_time) {
            let complete_due_date = new Date(sa.x.getFullYear(), sa.x.getMonth(), sa.x.getDate(), sa.due_time.hour, sa.due_time.minute);
            // If the due date exists but the assignment date doesn't meaning assignment needs more info, set the due date number to the due date and today
            sa.x = mathUtils.daysBetweenTwoDates(sa.x, sa.assignment_date);
            sa.complete_x = mathUtils.daysBetweenTwoDates(complete_due_date, sa.assignment_date, {round: false});
        } else {
            // If the due date exists but the assignment date doesn't meaning assignment needs more info, set the due date number to the due date and today
            sa.x = mathUtils.daysBetweenTwoDates(sa.x, sa.assignment_date);
            sa.complete_x = sa.x;
        }
        

        if (sa.due_time && (sa.due_time.hour || sa.due_time.minute)) {
            sa.x++;
        }
        if (sa.name === EXAMPLE_ASSIGNMENT_NAME) {
            sa.assignment_date = new Date(date_now.valueOf());
            sa.fake_assignment_date = false;
        }
        if (isExampleAccount) {
            sa.assignment_date.setDate(sa.assignment_date.getDate() + x_transform);
            sa.fake_assignment_date = false; // probably isnt needed but ill keep this here anyways
        }
    }
    if (VIEWING_DELETED_ASSIGNMENTS) {
        sa.deletion_time = new Date(sa.deletion_time);
    }
    // Repopulating the form (min work time is capped and divided)
    sa.original_min_work_time = +sa.min_work_time;
    if (!Number.isFinite(sa.original_min_work_time) || sa.original_min_work_time === 0)
        sa.original_min_work_time = '';

    if (sa.y) sa.y = +sa.y;
    if (sa.time_per_unit) sa.time_per_unit = +sa.time_per_unit;
    if (sa.funct_round) sa.funct_round = +sa.funct_round;
    if (sa.min_work_time) sa.min_work_time = +sa.min_work_time;
    if (sa.skew_ratio) sa.skew_ratio = +sa.skew_ratio;
    sa.works = sa.works.map(Number);
    sa.break_days = sa.break_days.map(Number);
    if (!sa.tags) sa.tags = [];

    const red_line_start_x = sa.fixed_mode ? 0 : sa.dynamic_start; // X-coordinate of the start of the red line
    const red_line_start_y = sa.fixed_mode ? 0 : sa.works[red_line_start_x - sa.blue_line_start]; // Y-coordinate of the start of the red line

   
    
    let y1 = sa.y - red_line_start_y;
    if (y1 >= 0 && Number.isFinite(y1)) {
        // Caps and adjusts min_work_time and funct_round; needed in parabola.js i think
        // Let's individually justify the y1 > 0 and the y1 != 0 requesites for these cases:

        // y1 > 0:
        // makes sure y1 isn't negative which makes funct_round negative and makes some quadratic formulas in parabola.js NaN
        // (y1 can be negative if you enter work inputs and then edit the assignment to have a lower number of units of work)

        // y1 != 0:
        // to ensure funct_round isn't 0, which causes Assignment.funct to return NaN
        if (Number.isFinite(sa.funct_round) && sa.funct_round > y1 && y1 !== 0) {
            sa.funct_round = y1;
        }

        // y1 > 0:
        // I haven't ran into a specific issue with this (but im sure one exists) but 
        // it is completely nonsensical to have a negative minimum work time

        // Don't make y1 != 0 a condition
        // The goal of this if statement is the cap the minimum work time at the number of units of work remaining
        // So, if there are 0 units of work remaining, the minimum work time should be capped at 0
        if (Number.isFinite(sa.min_work_time) && sa.min_work_time > y1) {
            sa.min_work_time = y1;
        }
    }

    // If funct_round is greater than min_work_time, every increase in work already fulfills the minimum work time
    // Set it to 0 to assume it isn't enabled for calculations in setParabolaValues()
    if (Number.isFinite(sa.min_work_time) && Number.isFinite(sa.funct_round) && sa.min_work_time <= sa.funct_round) {
        sa.min_work_time = 0;
    }

    if (isExampleAccount) {
        sa.break_days = sa.break_days.map(break_day => (break_day + x_transform) % 7);
    }
};
// Use DOMContentLoaded because $(function() { fires too slowly
document.addEventListener("DOMContentLoaded", function() {
    if (!VIEWING_DELETED_ASSIGNMENTS) {
        if (SETTINGS.gc_integration_enabled) ajaxUtils.createGCAssignments();
        utils.ui.setClickHandlers.tickButtons();
        utils.ui.setClickHandlers.assignmentsHeaderUI();
        utils.ui.setClickHandlers.assignmentSorting();
    }
    utils.ui.setClickHandlers.shortcuts();
    utils.ui.setKeybinds();
    utils.ui.displayFullDueDateOnHover();
    utils.ui.setAssignmentScaleUtils();
    setTimeout(() => {
        utils.ui.addTagHandlers();
        utils.ui.setAnimationSpeed();
    }, 0);
    utils.ui.saveAndLoadStates();
    utils.ui.navClickHandlers();
    $(window).on("focus", ajaxUtils.evaluateCurrentState);
    // https://stackoverflow.com/questions/23449917/run-js-function-every-new-minute
    let secondsRemaining = (60 - new Date().getSeconds()) * 1000;

    let minuteCounter = 0;
    setTimeout(function() {
        utils.ui.tickClock();
        setInterval(() => {
            utils.ui.tickClock();
            minuteCounter++;
            if (minuteCounter !== 60) return;

            minuteCounter = 0;
            $(window).trigger("resize");
            ajaxUtils.evaluateCurrentState();
            if (SETTINGS.gc_integration_enabled) ajaxUtils.createGCAssignments();
        }, 60 * 1000);
    }, secondsRemaining);
});