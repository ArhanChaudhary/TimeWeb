// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
const INCOMPLETE_WORKS = 10;
const NO_WORKING_DAYS = 9;
const NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT = 8;
const NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG = 7;
const NEEDS_MORE_INFO_AND_GC_ASSIGNMENT = 6;
const UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW = 5;
const UNFINISHED_FOR_TODAY = 4;
const FINISHED_FOR_TODAY = 3;
const NOT_YET_ASSIGNED = 2;
const COMPLETELY_FINISHED = 1;


class Priority {
    constructor() {
        var that = this;
        that.sort_timeout_duration = 35;
        that.dark_mode_alpha = 0.75;
    }
    
    percentageToColor(priority_percentage) {
        var that = this;
        const percentage_as_decimal = priority_percentage / 100;
        if (isNaN(percentage_as_decimal)) {
            var r = 255;
            var g = 255;
            var b = 255;
        } else {
            var r = lowest_priority_color.r + (highest_priority_color.r - lowest_priority_color.r) * percentage_as_decimal;
            var g = lowest_priority_color.g + (highest_priority_color.g - lowest_priority_color.g) * percentage_as_decimal;
            var b = lowest_priority_color.b + (highest_priority_color.b - lowest_priority_color.b) * percentage_as_decimal;
        }
        return {r, g, b};
    }
    // Handles coloring and animating assignments that were just created or edited
    colorOrTransitionAssignment(dom_assignment) {
        var that = this;
        if ($("#animate-in").length && that.is_element_submitted) {
            // If a new assignment was created and the assignment that colorOrTransitionAssignment() was called on is the assignment that was created, animate it easing in
            // I can't just have is_element_submitted as a condition because is_element_submitted will be true for both "#animate-in" and "#animate-color"
            dom_assignment.parents(".assignment-container").animate({
                top: "0", 
                opacity: "1", 
                marginBottom: "0",
            }, 1500, "easeOutCubic");
        }
        // A jQuery animation isn't needed for the background of "#animate-color" because it is transitioned using css
        if (color_priority) {
            if (that.params.first_sort) {
                dom_assignment.addClass("transition-instantly");
            }
            const background_color = that.percentageToColor(that.priority_percentage);
            const a = $("html").is("#dark-mode") ? that.dark_mode_alpha : 1;
            dom_assignment.parents(".assignment-container").toggleClass("invert-text-color", (background_color.r + background_color.g + background_color.b) / 3 <= 255 / 2);
            background_color.r = Math.round(background_color.r * a);
            background_color.g = Math.round(background_color.g * a);
            background_color.b = Math.round(background_color.b * a);
            dom_assignment.css("background-color", `rgb(${background_color.r},${background_color.g},${background_color.b})`);
            dom_assignment.toggleClass("mark-as-done", that.mark_as_done);
            if (that.params.first_sort) {
                dom_assignment[0].offsetHeight;
                dom_assignment.removeClass("transition-instantly");
            }
        }
    }
    setInitialTopOffsets($assignment_container) {
        var that = this;
        $assignment_container.each(function() {
            $(this).attr("data-initial-top-offset", $(this).offset().top);
        });
    }

    domSortAssignments(ordered_assignments) {
        var that = this;
        // Selection sort
        for (let [index, sa] of ordered_assignments.entries()) {
            // index represents the selected assignment's final position
            // sa[2] represents the selected assignment's current position
            if (index !== sa[2]) {
                // Swap them in the dom
                that.domSwapAssignments(index, sa[2]);
                // Swap them in ordered_assignments
                ordered_assignments.find(sa => sa[2] === index)[2] = sa[2]; // Adjust index of assignment that used to be there 
                sa[2] = index; // Adjust index of current swapped assignment
            }
        }
    }

    domSwapAssignments(tar1_index, tar2_index) {  
        const tar1 = $(".assignment-container").eq(tar1_index),
                tar2 = $(".assignment-container").eq(tar2_index);
        const swap_temp = $("<span></span>").insertAfter(tar2);
        tar1.after(tar2);
        swap_temp.after(tar1);
        swap_temp.remove();
    }

    transitionSwap(assignment_container) {
        const initial_height = assignment_container.attr("data-initial-top-offset");
        const current_translate_value = (assignment_container.css("transform").split(",")[5]||")").slice(0,-1); // Read the translateY value from the returned matrix
        // If an assignment is doing a transition and this is called again, subtract its transform value to find its final top offset
        const final_height = assignment_container.offset().top - Math.sign(current_translate_value) * Math.floor(Math.abs(current_translate_value)); // the "Math" stuff floors or ceils the value closer to zero
        const transform_value = initial_height - final_height;
        assignment_container.removeAttr("data-initial-top-offset");
        assignment_container.addClass("transform-instantly")
                .css("transform", `translateY(${transform_value}px)`)
                [0].offsetHeight;
        assignment_container.removeClass("transform-instantly")
                .css({
                    transform: "",
                    transitionDuration: `${1.75 + Math.abs(transform_value)/2000}s`, // Delays longer transforms
                });
    }        

    positionTags(dom_assignment) {
        var that = this;
        dom_assignment.removeClass("tags-bottom");
        horizontal_tag_position === "Left" && that.positionTagLeftAndTagBottom(dom_assignment);
        vertical_tag_position === "Bottom" && dom_assignment.addClass("tags-bottom");
    }
    positionTagLeftAndTagBottom(dom_assignment) {
        var that = this;
        const dom_title = dom_assignment.find(".title");
        const dom_tags = dom_assignment.find(".tags");
        const dom_button = dom_assignment.find(".button");
        const dom_assignment_footer = dom_assignment.find(".assignment-footer");
        const add_priority_percentage = !!dom_title.attr("data-priority");
        const add_daysleft = !!dom_title.attr("data-daysleft");
        dom_assignment.css({paddingTop: "", paddingBottom: ""});
        dom_button.css({marginTop: "", marginBottom: ""});

        const tag_top = dom_tags.offset().top;
        const tag_height = dom_tags.height();

        let title_top = dom_title.offset().top;
        if (horizontal_tag_position === "Left") {
            if (vertical_tag_position === "Bottom") {
                if (add_daysleft) title_top -= 14;
            } else if (add_priority_percentage) {
                title_top -= 10;
            } else {
                title_top += 3;
            }
        }
        
        const padding_to_add = Math.max(0, tag_top - title_top + tag_height);
        dom_assignment.css({paddingTop: "+=" + padding_to_add, paddingBottom: "+=" + padding_to_add});
        dom_button.css({marginTop: "-=" + padding_to_add, marginBottom: "-=" + padding_to_add});
        dom_assignment_footer.css("top", parseFloat(dom_assignment.css("padding-bottom")) - parseFloat(dom_assignment_footer.find(".graph-container").first().css("margin-top")));
        dom_tags.prop("style").setProperty('--margin-top', parseFloat(dom_assignment.css("padding-bottom")));
    }
    sort(params={}) {
        var that = this;
        that.params = params;
        clearTimeout(that.sort_timeout);
        if (that.params.timeout) {
            that.sort_timeout = setTimeout(() => that.sortWithoutTimeout(), that.sort_timeout_duration);
        } else {
            that.sortWithoutTimeout();
        }
    }
    sortWithoutTimeout() {
        let ordered_assignments = [],
            total = 0,
            tomorrow_total = 0;
        $(".first-add-line-wrapper, .last-add-line-wrapper").removeClass("first-add-line-wrapper last-add-line-wrapper");
        $(".delete-gc-assignments-from-class").remove();
        var that = this;
        $(".assignment").each(function(index) {
            const dom_assignment = $(this);
            const sa = new Assignment(dom_assignment);
            sa.setParabolaValues();
            if (that.params.first_sort) {
                // Fix dynamic start if y or anything else was changed
                // setParabolaValues needs to be above for it doesn't run in this function with fixed mode

                // Don't sa.autotuneSkewRatio() because we don't want to change the skew ratio when the user hasn't submitted any work inputs
                const old_dynamic_start = sa.sa.dynamic_start;
                sa.setDynamicStartIfInDynamicMode();
                old_dynamic_start !== sa.sa.dynamic_start && ajaxUtils.sendAttributeAjaxWithTimeout("dynamic_start", sa.sa.dynamic_start, sa.sa.id);
            }
            let display_format_minutes = false;
            let len_works = sa.sa.works.length - 1;
            let last_work_input = sa.sa.works[len_works];
            let today_minus_ad = mathUtils.daysBetweenTwoDates(date_now, sa.sa.assignment_date);
            let todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
            const assignment_container = $(".assignment-container").eq(index),
                dom_status_image = $(".status-image").eq(index),
                dom_status_message = $(".status-message").eq(index),
                dom_title = $(".title").eq(index),
                dom_completion_time = $(".completion-time").eq(index),
                dom_tags = $(".tags").eq(index);
            let has_autofilled = false;
            let first_tag = sa.sa.tags[0];
            if (["Important","Not Important"].includes(first_tag)) first_tag = undefined;
            const number_of_forgotten_days = today_minus_ad - (sa.sa.blue_line_start + len_works); // Make this a variable so len_works++ doesn't affect this
            if (!sa.sa.needs_more_info && that.params.autofill_all_work_done && number_of_forgotten_days > 0) {
                for (let i = 0; i < number_of_forgotten_days; i++) {
                    todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
                    // Don't use "sa.sa.soft" logic because this will always complete the assignment if the due date already passed
                    if (len_works + sa.sa.blue_line_start === sa.sa.x) break; // Don't autofill past completion
                    has_autofilled = true;
                    last_work_input += Math.max(0, todo);
                    sa.sa.works.push(last_work_input);
                    len_works++;
                }
                if (has_autofilled) {
                    // don't sa.setDynamicStartIfInDynamicMode() because of the (input_done !== todo) check
                    ajaxUtils.sendAttributeAjaxWithTimeout("works", sa.sa.works.map(String), sa.sa.id);
                    ajaxUtils.sendAttributeAjaxWithTimeout("dynamic_start", sa.sa.dynamic_start, sa.sa.id);
                    todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input;
                }
            }
            let str_daysleft, status_value, status_message, status_image;
            if (sa.sa.needs_more_info) {
                status_image = 'question-mark';
                if (sa.sa.is_google_classroom_assignment) {
                    status_message = "This Google Classroom Assignment needs more Info!<br>Please Edit this Assignment";
                    if (first_tag)
                        status_value = NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG;
                    else
                        status_value = NEEDS_MORE_INFO_AND_GC_ASSIGNMENT;
                } else {
                    status_message = "This Assignment needs more Info!<br>Please Edit this Assignment";
                    status_value = NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT;
                }
                dom_status_image.attr({
                    width: 11,
                    height: 18,
                }).css("margin-left", 2);
            // (sa.sa.x <= today_minus_ad && !sa.sa.soft)
            // This marks the assignment as completed if its due date passes
            // However, if the due date is soft, the system doesnt know whether or not the user finished the assignment or needs to extend its due date
            // So, dont star it because the user may misinterpret that as having completed the assignment when in reality the user may need an extension
            // Instead, give it a question mark so it can be appropriately handled
            } else if (last_work_input >= sa.sa.y || (sa.sa.x <= today_minus_ad && !sa.sa.soft)) {
                status_image = "completely-finished";
                if (last_work_input >= sa.sa.y)
                    status_message = 'You\'re Completely Finished with this Assignment';
                else
                    status_message = 'This Assignment\'s Due Date has Passed';
                dom_status_image.attr({
                    width: 16,
                    height: 16,
                }).css("margin-left", -3);
                status_value = COMPLETELY_FINISHED;
            } else if (today_minus_ad < 0) {
                status_image = "no-status-image";
                status_message = 'This Assignment hasn\'t yet been Assigned';
                if (today_minus_ad === -1) {
                    str_daysleft = 'Assigned Tomorrow';
                } else if (today_minus_ad > -7) {
                    str_daysleft = `Assigned on ${sa.sa.assignment_date.toLocaleDateString("en-US", {weekday: 'long'})}`;
                } else {
                    str_daysleft = `Assigned in ${-today_minus_ad}d`;
                }
                status_value = NOT_YET_ASSIGNED;
            } else {
                if (that.params.autofill_no_work_done && number_of_forgotten_days > 0) {
                    let reached_end_of_assignment = false;
                    for (let i = 0; i < number_of_forgotten_days; i++) {
                        if (!sa.sa.soft && len_works + sa.sa.blue_line_start === sa.sa.x - 1) {
                            reached_end_of_assignment = true;
                            break;
                        }
                        has_autofilled = true;
                        sa.sa.works.push(last_work_input);
                        len_works++;
                    }
                    /**
                     * 
                     * t x   r
                     * 1 5 > 5
                     * 2 5 > 5
                     * 3 5 > 5
                     * 4 5 > 5
                     * 5 5 > 6
                     * 6 6 > 7
                     * 7 7 > 8
                     * 10 7 > 11
                     */
                    if (sa.sa.soft && today_minus_ad >= sa.sa.x) {
                        sa.sa.x = today_minus_ad + 1;
                        const due_date = new Date(sa.sa.assignment_date.valueOf());
                        due_date.setDate(due_date.getDate() + sa.sa.x);
                        ajaxUtils.sendAttributeAjaxWithTimeout("x", due_date.getTime()/1000, sa.sa.id);
                    }
                    // Remove from "if has_autofilled" because this may need to run even if nothing autofills
                    ajaxUtils.sendAttributeAjaxWithTimeout("works", sa.sa.works.concat(reached_end_of_assignment ? [last_work_input] : []).map(String), sa.sa.id);
                    if (has_autofilled) {
                        for (let i = 0; i < AUTOTUNE_ITERATIONS; i++) {
                            sa.setDynamicStartIfInDynamicMode();
                            sa.autotuneSkewRatio();
                        }
                        sa.setDynamicStartIfInDynamicMode();
                        ajaxUtils.sendAttributeAjaxWithTimeout("dynamic_start", sa.sa.dynamic_start, sa.sa.id);
                        ajaxUtils.sendAttributeAjaxWithTimeout("skew_ratio", sa.sa.skew_ratio, sa.sa.id);
                        todo = sa.funct(len_works+sa.sa.blue_line_start+1) - last_work_input; // Update this if loop ends
                    }
                }
                let x1 = sa.sa.x - sa.red_line_start_x;
                if (sa.sa.break_days.length) {
                    const mods = sa.calcModDays();
                    x1 -= Math.floor(x1 / 7) * sa.sa.break_days.length + mods[x1 % 7];
                }
                var due_date_minus_today = sa.sa.x - today_minus_ad;
                const todo_is_completed = todo <= 0 || today_minus_ad < len_works + sa.sa.blue_line_start;
                const current_work_input_is_break_day = sa.sa.break_days.includes((sa.assign_day_of_week + today_minus_ad) % 7) && due_date_minus_today !== 1;
                if (today_minus_ad > len_works + sa.sa.blue_line_start || !x1) {
                    status_image = 'question-mark';
                    if (!x1) {
                        status_message = 'This Assignment has no Working Days!<br>Please Edit this Assignment\'s break days';
                        status_value = NO_WORKING_DAYS;
                    } else {
                        status_message = "You haven't Entered your past Work Inputs!<br>Please Enter your Progress to Continue";
                        status_value = INCOMPLETE_WORKS;
                    }
                    sa.sa.mark_as_done === true && ajaxUtils.sendAttributeAjaxWithTimeout("mark_as_done", false, sa.sa.id);
                    sa.sa.mark_as_done = false;
                    dom_status_image.attr({
                        width: 11,
                        height: 18,
                    }).css("margin-left", 2);
                } else if (todo_is_completed || current_work_input_is_break_day) {
                    status_image = 'finished';
                    if (current_work_input_is_break_day) {
                        status_message = 'Today is this Assignment\'s Break Day';
                    } else {
                        status_message = 'Nice Job! You\'re Finished with this Assignment\'s Work for Today';
                    }
                    dom_status_image.attr({
                        width: 15,
                        height: 15,
                    }).css("margin-left", -2);
                    status_value = FINISHED_FOR_TODAY;
                } else {
                    status_value = UNFINISHED_FOR_TODAY;
                    display_format_minutes = true;
                    status_image = 'unfinished';
                    status_message = "This Assignment's Daily Work is Unfinished";
                    dom_status_image.attr({
                        width: 15,
                        height: 15,
                    }).css("margin-left", -2);
                    if (sa.unit_is_of_time) {
                        status_message += `<br>Complete ${mathUtils.precisionRound(todo, 10)} ${pluralize(sa.sa.unit,todo)} of Work Today`;
                    } else {
                        status_message += `<br>Complete ${mathUtils.precisionRound(todo, 10)} ${pluralize(sa.sa.unit,todo)} Today`;
                    }
                    total += Math.ceil(sa.sa.mark_as_done ? 0 : todo*sa.sa.time_per_unit);
                }
                if (due_date_minus_today < -1) {
                    str_daysleft = -due_date_minus_today + "d Ago";
                } else if (due_date_minus_today === -1) {
                    str_daysleft = 'Yesterday';
                } else if (due_date_minus_today === 0) {
                    str_daysleft = 'Today';
                } else if (due_date_minus_today === 1) {
                    str_daysleft = 'Tomorrow';
                    tomorrow_total += Math.ceil(sa.sa.mark_as_done ? 0 : todo*sa.sa.time_per_unit);
                    if ([UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW, UNFINISHED_FOR_TODAY, FINISHED_FOR_TODAY, NOT_YET_ASSIGNED, COMPLETELY_FINISHED].includes(status_value)) {
                        status_value = UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW;
                    }
                } else if (due_date_minus_today < 7) {
                    const due_date = new Date(sa.sa.assignment_date.valueOf());
                    due_date.setDate(due_date.getDate() + sa.sa.x);
                    str_daysleft = due_date.toLocaleDateString("en-US", {weekday: 'long'});
                } else {
                    str_daysleft = due_date_minus_today + "d";
                }
            }
            // Ignore tags if its a google classroom assignment and it needs more info because important and not important can mess up some ordering
            // Not needed anymore because of NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG
            // if (!(sa.sa.is_google_classroom_assignment && sa.sa.needs_more_info)) {
                if (sa.sa.tags.includes("Important")) {
                    status_value += 0.25;
                }
                if (sa.sa.tags.includes("Not Important")) {
                    status_value -= 0.25;
                }
            // }
            const ignore_tag_status_value = Math.round(status_value);
            // Add finished to assignment-container so it can easily be deleted with $(".finished").remove() when all finished assignments are deleted in advanced
            assignment_container.toggleClass("finished", ignore_tag_status_value === COMPLETELY_FINISHED);
            assignment_container.toggleClass("incomplete-works", ignore_tag_status_value === INCOMPLETE_WORKS);
            assignment_container.toggleClass("question-mark", [NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, NO_WORKING_DAYS, INCOMPLETE_WORKS].includes(ignore_tag_status_value));
            assignment_container.toggleClass("add-line-wrapper", ignore_tag_status_value === COMPLETELY_FINISHED || ignore_tag_status_value === INCOMPLETE_WORKS);

            let status_priority;
            if (ignore_tag_status_value === COMPLETELY_FINISHED) {
                status_priority = -index;
            } else if (ignore_tag_status_value === NOT_YET_ASSIGNED) {
                status_priority = today_minus_ad;
            } else if ([NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT].includes(ignore_tag_status_value)) {
                // Order assignments that need more info by their tags lexicographically
                status_priority = (first_tag||sa.sa.name).toLowerCase();
            } else if ([FINISHED_FOR_TODAY, NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, NO_WORKING_DAYS, INCOMPLETE_WORKS].includes(ignore_tag_status_value)) {
                // Order question mark and check mark assignments by their absolute distance to their due date
                status_priority = -Math.abs(due_date_minus_today);
            } else {
                status_priority = todo*sa.sa.time_per_unit/(sa.sa.x-sa.sa.blue_line_start-len_works);
            }
            
            let priority_data = [status_value, status_priority, index];
            if (sa.sa.mark_as_done && [UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW, UNFINISHED_FOR_TODAY, FINISHED_FOR_TODAY, NOT_YET_ASSIGNED, COMPLETELY_FINISHED].includes(ignore_tag_status_value)) {
                priority_data.push(true);
            }
            ordered_assignments.push(priority_data);

            if (status_image === "no-status-image") {
                // https://stackoverflow.com/questions/5775469/whats-the-valid-way-to-include-an-image-with-no-src
                dom_status_image.attr("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=");
            } else {
                dom_status_image.attr("src", `/static/images/status-icons/${status_image}.png`);
            }
            dom_status_message.html(status_message);
            dom_title.attr("data-daysleft", str_daysleft);
            dom_tags.toggleClass("assignment-has-daysleft", vertical_tag_position === "Bottom" && horizontal_tag_position === "Left" && !!str_daysleft);
            dom_completion_time.html(display_format_minutes ? utils.formatting.formatMinutes(todo * sa.sa.time_per_unit) : '');
        });
        // Updates open graphs' today line
        $(window).trigger("resize");
        ordered_assignments.sort(function(a, b) {
            // Sort from max to min
            const status_value1 = a[0];
            const status_value2 = b[0];
            const status_priority1 = a[1];
            const status_priority2 = b[1];
            const index1 = a[2];
            const index2 = b[2];
            // Max to min
            if (status_value1 < status_value2) return 1;
            if (status_value1 > status_value2) return -1;

            const ignore_tag_status_value1 = Math.round(status_value1); // using status_value2 also works
            if ([NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG].includes(ignore_tag_status_value1) 
            || reverse_sorting && [UNFINISHED_FOR_TODAY, UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW].includes(ignore_tag_status_value1)) {
                // If the assignment is a google classroom assignment that needs more info and has a first tag (because the status priority is now their first tag) or is sorting in reverse, sort from min to max
                if (status_priority1 < status_priority2) return -1;
                if (status_priority1 > status_priority2) return 1;
            } else {
                if (status_priority1 < status_priority2) return 1;
                if (status_priority1 > status_priority2) return -1;
            }
            // If the status value and status priority are the same, sort them by their index, which will always be different from each other
            // Sort from min to max otherwise they will infinitly swap with each other every time they are resorted
            if (index1 < index2) return -1;
            if (index1 > index2) return 1;
        });
        // Source code lurkers, uncomment this for some fun
        // function shuffleArray(array) {for (var i = array.length - 1; i > 0; i--) {var j = Math.floor(Math.random() * (i + 1));var temp = array[i];array[i] = array[j];array[j] = temp;}};shuffleArray(ordered_assignments);
        const highest_priority = Math.max(...ordered_assignments.map(function(pd) {
            const status_value = Math.round(pd[0]);
            if ([UNFINISHED_FOR_TODAY, UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW].includes(status_value) && !pd[3]) {
                return pd[1];
            } else {
                return -Infinity;
            }
        }));
        const question_mark_exists_excluding_gc = ordered_assignments.some(function(pd) {
            const status_value = Math.round(pd[0]);
            return [NO_WORKING_DAYS, INCOMPLETE_WORKS].includes(status_value);
        });
        let prev_assignment_container;
        let prev_tag;
        let already_found_first_incomplete_works = false;
        let already_found_first_finished = false;
        $("#autofill-work-done, #delete-starred-assignments").hide();
        for (let [index, pd] of ordered_assignments.entries()) {
            const status_value = Math.round(pd[0]);
            // originally status_value <= UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW && (pd[3] || question_mark_exists_excluding_gc); if pd[3] is true then status_value <= UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW
            const mark_as_done = !!(pd[3] || question_mark_exists_excluding_gc && [UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW, UNFINISHED_FOR_TODAY, FINISHED_FOR_TODAY, NOT_YET_ASSIGNED, COMPLETELY_FINISHED].includes(status_value));
            that.mark_as_done = mark_as_done;
            const dom_assignment = $(".assignment").eq(pd[2]); // Need to define this so z
            that.dom_assignment = dom_assignment;
            const assignment_container = that.dom_assignment.parents(".assignment-container");
            let priority_percentage;
            if ([NEEDS_MORE_INFO_AND_GC_ASSIGNMENT, NEEDS_MORE_INFO_AND_GC_ASSIGNMENT_WITH_FIRST_TAG, NEEDS_MORE_INFO_AND_NOT_GC_ASSIGNMENT, NO_WORKING_DAYS, INCOMPLETE_WORKS].includes(status_value)) {
                priority_percentage = NaN;
            } else if (that.mark_as_done || [FINISHED_FOR_TODAY, NOT_YET_ASSIGNED, COMPLETELY_FINISHED].includes(status_value) /* NOT_YET_ASSIGNED needed for "This assignment has not yet been assigned" being set to color values greater than 1 */) {
                priority_percentage = 0;
            } else {
                priority_percentage = Math.max(1, Math.floor(pd[1] / highest_priority * 100 + 1e-10));
                if (!Number.isFinite(priority_percentage)) {
                    priority_percentage = 100;
                }
            }
            that.priority_percentage = priority_percentage;
            const add_priority_percentage = text_priority && [UNFINISHED_FOR_TODAY, UNFINISHED_FOR_TODAY_AND_DUE_TOMORROW].includes(status_value) && !that.mark_as_done;
            const dom_title = $(".title").eq(pd[2]);
            dom_title.attr("data-priority", add_priority_percentage ? `Priority: ${that.priority_percentage}%` : "");

            const first_sort = this.params.first_sort;
            new Promise(function(resolve) {
                if (that.params.first_sort) {
                    $(window).one("load", () => resolve());
                } else {
                    resolve();
                }
            }).then(function() {
                that.positionTags(dom_assignment);
            });
            if (that.params.first_sort && assignment_container.is("#animate-color, #animate-in")) {
                new Promise(function(resolve) {
                    $(window).one('load', function() {
                        // Since "#animate-in" will have a bottom margin of negative its height, the next assignment will be in its final position at the start of the animation
                        // So, scroll to the next assignment instead
                        // Scroll to dom_assignment because of its scroll-margin
                        let assignment_to_scroll_to = $(".assignment").eq(ordered_assignments[index + 1] ? ordered_assignments[index + 1][2] : undefined);
                        if (!assignment_to_scroll_to.length || $("#animate-color").length) {
                            // If "#animate-color" exists or "#animate-in" is the last assignment on the list, scroll to itself instead
                            assignment_to_scroll_to = that.dom_assignment;
                        }
                        setTimeout(function() {
                            // scrollIntoView sometimes doesn't work without setTimeout
                            assignment_to_scroll_to[0].scrollIntoView({
                                behavior: 'smooth',
                                block: 'nearest',
                            });
                        }, 0);
                        // utils.scroll determines when the page has stopped scrolling and internally resolves the promise
                        $("main").scroll(() => utils.scroll(resolve));
                        utils.scroll(resolve);
                    });
                }).then(function() {
                    that.is_element_submitted = true;
                    that.priority_percentage = priority_percentage;
                    that.params.first_sort = first_sort;
                    that.mark_as_done = mark_as_done;
                    that.colorOrTransitionAssignment(dom_assignment);
                });
            } else {
                that.is_element_submitted = false;
                that.colorOrTransitionAssignment(dom_assignment);
            }

            // Loops through every google classroom assignment that needs more info AND has a tag (representing their class) to add "delete all assignments of this class"
            // Uses the same below logic for delete starred assignments and autoill work done

            // This has to be looped before they are sorted so setInitialTopOffsets is accurate
            // This means we can't loop through ".assignment-container" because it's currently unsorted, so we instead have to loop through ordered_assignments
            // The current looped assignment's tag is compared with the previous looped assignment's tag
            // If they are different, the previous assignment is the last assignment with its tag and the current assignment is the first assignment with its tag
            const sa = utils.loadAssignmentData(that.dom_assignment);

            const current_tag = ["Not Important", "Important"].includes(sa.tags[0]) ? undefined : sa.tags[0];
            if (sa.is_google_classroom_assignment && sa.needs_more_info && current_tag) {
                assignment_container.addClass("add-line-wrapper");
                if (current_tag !== prev_tag) { // Still works if an assignment needs more info but doesn't have a tag
                    if (prev_assignment_container) prev_assignment_container.addClass("last-add-line-wrapper");
                    assignment_container.addClass("first-add-line-wrapper").prepend($(DELETE_GC_ASSIGNMENTS_FROM_CLASS_TEMPLATE));
                }
                prev_tag = current_tag;
                prev_assignment_container = assignment_container;
            }

            if (status_value === INCOMPLETE_WORKS && !already_found_first_incomplete_works) {
                $("#autofill-work-done").show().insertBefore(that.dom_assignment);
                already_found_first_incomplete_works = true;
            }

            if (status_value === COMPLETELY_FINISHED && !already_found_first_finished) {
                $("#delete-starred-assignments").show().insertBefore(that.dom_assignment);
                already_found_first_finished = true;
            }
        }
        if (prev_assignment_container) {
            prev_assignment_container.addClass("last-add-line-wrapper");
        }
        if (!that.params.first_sort) that.setInitialTopOffsets($(".assignment-container"));
        that.domSortAssignments(ordered_assignments);
        const number_of_assignments = $(".assignment").length;
        $(".assignment-container").each(function(index) {
            const assignment_container = $(this);
            // Fixes the tag add box going behind the below assignment on hover
            const dom_assignment = assignment_container.children(".assignment");
            dom_assignment.css("z-index", number_of_assignments - index);
            if (!that.params.first_sort) {
                that.transitionSwap(assignment_container);
            }
        });

        // Make sure this is set after assignments are sorted and swapped
        if (that.params.first_sort && $("#animate-in").length) {
            // Set initial transition values for "#animate-in"
            // Needs to be after domswap or else "top" bugs out 
            
            // Load the fonts first or height() may return the wrong values
            document.fonts.ready.then(function() {
                $("#animate-in").css({
                    top: $("#assignments-container").offset().top + $("#assignments-container").height() - $("#animate-in").offset().top + 20, // Move to below the last assignment and add a 20px margin
                    opacity: "0",
                    marginBottom: -($("#animate-in").height()+10), // +10 deals with margins
                });
            });
        }
        // Replicates first-of-class and last-of-class to draw the shortcut line wrapper in index.css
        $(".finished").first().addClass("first-add-line-wrapper");
        $(".finished").last().addClass("last-add-line-wrapper");
        $(".incomplete-works").first().addClass("first-add-line-wrapper");
        $(".incomplete-works").last().addClass("last-add-line-wrapper");

        if (question_mark_exists_excluding_gc) {
            $("#current-time, #tomorrow-time, #info").hide();
        } else if (!total) {
            $("#info").show();
            $("#estimated-total-time").html(dat.length ? 'You have Finished everything for Today!' : 'You don\'t have any Assignments');
            $("#current-time, #tomorrow-time, #hide-button").hide();
        } else {
            $("#current-time, #tomorrow-time, #hide-button, #info").show();
            $("#estimated-total-time").html(utils.formatting.formatMinutes(total)).attr("data-minutes", total);
            $("#tomorrow-time").html(` (${tomorrow_total === total ? "All" : utils.formatting.formatMinutes(tomorrow_total)} due Tomorrow)`);
            if (tomorrow_total === total) {
                $("#tomorrow-time").html(" (Everything is due Tomorrow)");
            } else if (tomorrow_total === 0) {
                $("#tomorrow-time").html(" (Nothing is due Tomorrow)");
            } else {
                $("#tomorrow-time").html(` (${utils.formatting.formatMinutes(tomorrow_total)} due Tomorrow)`);
            }
        }
        utils.ui.old_minute_value = undefined; // Force tickClock to update. Without this, it may not update and display (Invalid Date)
        utils.ui.tickClock();
        if (that.params.first_sort) {
            setInterval(utils.ui.tickClock, 1000);
        }
        $("#assignments-container").css("opacity", "1");
    }
}
document.addEventListener("DOMContentLoaded", function() {
    DELETE_GC_ASSIGNMENTS_FROM_CLASS_TEMPLATE = $("#delete-gc-assignments-from-class-template").html();
    priority = new Priority();
    priority.sort({ first_sort: true });
});