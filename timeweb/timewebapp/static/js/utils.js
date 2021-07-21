/* 
This file includes the code for:

Preventing submitting form on refresh
Parsing date on safari
Resolving a promise passed to a scroll function that determines when a scroll ends
Hide button
Advanced options
Sending attribute AJAX
Preserving page state before refresh
Setting up the tutorial
Other minor utilities

This only runs on index.html
*/
gtag("event", "home");
utils = {
    formatting: {
        // Reverses utils.formatting.parseDate
        // Converts Date objects to YYYY-MM-DD
        stringifyDate: function(date) {
            return [
                ('000' + date.getFullYear()).slice(-4),
                ('0' + (date.getMonth() + 1)).slice(-2),
                ('0' + date.getDate()).slice(-2),
            ].join('-');
        },
        formatMinutes: function(total_minutes) {
            const hour = Math.floor(total_minutes / 60),
                minute = Math.ceil(total_minutes % 60);
            if (!hour) return (total_minutes && total_minutes < 1) ? "<1m" : minute + "m";
            if (!minute) return hour + "h";
            return hour + "h " + minute + "m";
        },
        // cite
        // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
        hexToRgb: function(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
        }
          
    },
    ui: {
        tickClock: function() {
            const estimated_completion_time = new Date(date_now.valueOf());
            const minute_value = estimated_completion_time.getMinutes();
            if (minute_value !== utils.ui.old_minute_value) {
                estimated_completion_time.setMinutes(minute_value + +$("#estimated-total-time").attr("data-minutes"));
                if (isNaN(estimated_completion_time.getMinutes())) {
                    estimated_completion_time.setTime(8640000000000000);
                }
                $("#current-time").html(` (${estimated_completion_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
                utils.ui.old_minute_value = minute_value;
            }
        },
        setClickHandlers: {
            toggleEstimatedCompletionTimeButton: function() {
                // Hide and show estimated completion time
                $("#hide-button").click(function() {
                    if ($(this).html() === "Hide") {
                        $(this).html("Show");
                        localStorage.setItem("hide-button", true);
                    } else {
                        $(this).html("Hide");
                        localStorage.removeItem("hide-button");
                    }
                    $("#estimated-total-time, #current-time, #tomorrow-time").toggle();
                });
                if ("hide-button" in localStorage) {
                    $("#hide-button").html("Show").prev().toggle();
                }
            },

            advancedInputs: function() {
                // Advanced inputs for the graph
                $(".advanced-buttons").click(function() {
                    $(".skew-ratio-button, .skew-ratio-textbox, .skew-ratio-textbox + .info-button, .fixed-mode-button").toggle();
                    $(".advanced-buttons").toggle();
                });
                $(".second-advanced-button").toggle();
                $(".skew-ratio-button, .skew-ratio-textbox, .fixed-mode-button").toggle(); // .skew-ratio-textbox + .info-button is hidden in graph.js
                // Advanced inputs for form
                $("#id_funct_round, #id_min_work_time, #break-days-label-title, #id_description").parent().addClass("hidden-field");
                $("#break-days-wrapper").addClass("hidden-field");
                $("#form-wrapper #advanced-inputs").click(function() {
                    if ($("#break-days-wrapper").hasClass("hidden-field")) {
                        var field_to_scroll_to = $(".hidden-field").first();
                    }
                    $("#id_funct_round, #id_min_work_time, #break-days-label-title, #id_description").parent().toggleClass("hidden-field");
                    $("#break-days-wrapper").toggleClass("hidden-field");
                    if (field_to_scroll_to) {
                        field_to_scroll_to[0].scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                        });
                    }
                });
            },

            headerIcons: function() {
                // Assignments header icons
                $("#open-assignments").click(function() {
                    if ($(".question-mark").length) {
                        $(".assignment-container.question-mark .assignment:not(.open-assignment)").click();
                    } else {
                        $(".assignment:not(.open-assignment)").click();
                    }
                });
        
                $("#close-assignments").click(function() {
                    if ($(".question-mark").length) {
                        $(".assignment-container.question-mark .assignment.open-assignment").click();
                    } else {
                        $(".assignment.open-assignment").click();
                    }
                });
        
                $("#simulated-date").hide();
                $("#next-day").click(function() {
                    ajaxUtils.disable_ajax = true;
                    date_now.setDate(date_now.getDate() + 1);
                    $("#simulated-date").show().text("Simulated date: " + date_now.toLocaleDateString("en-US", {month: 'long', day: 'numeric', weekday: 'long'}))
                    $(window).trigger("resize");
                    priority.sort({ ignore_timeout: true });
                })
                $("#next-day-icon-label").info("bottom",
                    `Simulates the next day for ALL assignments
                    
                    All changes made in the simulation are NOT saved, except for adding or editing assignments. Your assignments can be restored by refreshing this page`
                );
                $("#settings").click(function() {
                    window.location.href = "/settings";
                });
            },

            googleClassroomAPI: function() {
                if (oauth_token.token) {
                    $("#toggle-gc-label").html("Disable Google Classroom API");
                } else {
                    $("#toggle-gc-label").html("Enable Google Classroom API");
                }
                $("#toggle-gc-container").click(function() {
                    if (ajaxUtils.disable_ajax) return alert("You cannot do this on the example account!");
                    const $this = $(this);
                    if ($this.hasClass("clicked")) return;
                    $this.addClass("clicked");
                    $.ajax({
                        type: "POST",
                        url: "gc-api-auth-init",
                        data: {csrfmiddlewaretoken: csrf_token},
                        success: function(authentication_url) {
                            if (authentication_url === "Disabled gc api") {
                                $("#toggle-gc-label").html("Enable Google Classroom API");
                                $this.removeClass("clicked");
                            } else {
                                window.location.href = authentication_url;
                            }
                        },
                    });
                });
            },

            deleteAllStarredAssignments: function() {
                $("#delete-starred-assignments .shortcut-text").click(function() {
                    if (!confirm(`This will delete ${$(".finished").length} starred assignments. Are you sure?` + (isMobile ? '' : ' (Press Enter)'))) return;
                    const assignment_ids_to_delete = $(".assignment-container.finished").map(function() {
                        const dom_assignment = $(this).children(".assignment");
                        const _sa = utils.loadAssignmentData(dom_assignment);
                        return _sa.id;
                    }).toArray();
                    const data = {
                        'csrfmiddlewaretoken': csrf_token,
                        'action': 'delete_assignment',
                        'assignments': assignment_ids_to_delete,
                    }
                    const success = function() {
                        // Remove ids to delete from dat
                        dat = dat.filter(_sa => !assignment_ids_to_delete.includes(_sa.id));
                        $(".finished").remove();
                        for (let i = 0; i < assignment_ids_to_delete.length; i++) {
                            gtag("event","delete_assignment");
                        }
                        priority.sort({ ignore_timeout: true });
                    }
                    if (ajaxUtils.disable_ajax) return success();
                    // Send ajax to avoid a page reload
                    $.ajax({
                        type: "POST",
                        data: data,
                        success: success,
                        error: ajaxUtils.error,
                    });
                });
            },

            autofillAssignments: function() {
                $("#autofill-work-done").click(function(e) {
                    if ($(e.target).is("#autofill-selection")) return;
                    switch ($("#autofill-selection").val()) {
                        case "No":
                            if (confirm("This will autofill no work done until today for ALL assignments with missing work inputs. Are you sure?")) {
                                priority.sort({autofill_no_work_done: true, ignore_timeout: true});
                            }
                            break;
                        case "All":
                            if (confirm("This will autofill all work done until today for ALL assignments with missing work inputs. Are you sure?")) {
                                priority.sort({autofill_all_work_done: true, ignore_timeout: true});
                            }
                            break;
                    }
                });
                replaceAutofillInfo();
                $("#autofill-selection").on("change", replaceAutofillInfo);
                function replaceAutofillInfo() {
                    $("#autofill-work-done .shortcut-text").find(".info-button").remove();
                    let message;
                    switch ($("#autofill-selection").val()) {
                        case "No":
                            message = `Assumes you haven't done anything since your last work input and autofills in no work done until today. This applies to ALL assignments you haven't entered past work inputs for
                            
                            Click the horizontal line to perform this action`;
                            break;
                        case "All":
                            message = `Assumes you followed your work schedule since your last work input and autofills in all work done until today. This applies to ALL assignments you haven't entered past work inputs for
                            
                            Click the horizontal line to perform this action`;
                            break;
                    }
                    $("#autofill-work-done .shortcut-text").info("bottom", message, "append").css({marginLeft: -2, left: 1, bottom: 1});
                }
            },

            deleteAssignmentsFromClass: function() {
                $(".delete-gc-assignments-of-class").click(function() {
                    const dom_assignment = $(this).siblings(".assignment");
                    const sa = utils.loadAssignmentData(dom_assignment);
                    const assignments_to_delete = $(".assignment-container").filter(function() {
                        const dom_assignment = $(this).children(".assignment");
                        const _sa = utils.loadAssignmentData(dom_assignment);
                        return _sa.needs_more_info && _sa.tags[0] === sa.tags[0];
                    });
                    if (!confirm(`This will delete ${assignments_to_delete.length} assignments from class "${sa.tags[0]}". Are you sure?` + (isMobile ? '' : ' (Press Enter)'))) return;
                    const assignment_ids_to_delete = assignments_to_delete.map(function() {
                        const dom_assignment = $(this).children(".assignment");
                        const _sa = utils.loadAssignmentData(dom_assignment);
                        return _sa.id;
                    }).toArray();
                    const data = {
                        'csrfmiddlewaretoken': csrf_token,
                        'action': 'delete_assignment',
                        'assignments': assignment_ids_to_delete,
                    }
                    const success = function() {
                        dat = dat.filter(_sa => !assignment_ids_to_delete.includes(_sa.id));
                        assignments_to_delete.remove();
                        // Don't gtag here because the users technically didn't create the gc assignments (using the form)
                        priority.sort({ ignore_timeout: true });
                    }

                    if (ajaxUtils.disable_ajax) return success();
                    // Send ajax to avoid a page reload
                    $.ajax({
                        type: "POST",
                        data: data,
                        success: success,
                        error: ajaxUtils.error,
                    });
                });
            },
        },
        addTagHandlers: function() {
            const tag_add_selection_item_template = $("#tag-add-selection-item-template").html();
            const tag_template = $("#tag-template").html();
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
            $(".tag-add").click(tagAddClick);
            function tagAddClick(e) {
                const $this = $(this);
                // Close add tag box if "Add Tag" is clicked again
                if ($(e.target).parent().hasClass("tag-add") && $this.hasClass("open-tag-add-box")) {
                    $this.removeClass("open-tag-add-box");
                    transitionCloseTagBox($this);
                    return;
                }
                // Plus button was clicked
                if ($(e.target).is(".tag-add-button, .tag-add-plus")) {
                    const sa = utils.loadAssignmentData($this);
                    let tag_names = $this.find(".tag-add-selection-item.checked .tag-add-selection-item-name").map(function() {
                        return $(this).text();
                    }).toArray();
                    const inputted_tag_name = $this.find(".tag-add-input").val().trim();
                    if (inputted_tag_name && inputted_tag_name !== "Too Many Tags!") {
                        tag_names.push(inputted_tag_name);
                    }
                    if (!tag_names.length) return;
                    tag_names = tag_names.filter(tag_name => !sa.tags.includes(tag_name));
                    if (sa.tags.length + tag_names.length > max_number_tags) {
                        $(this).find(".tag-add-button").addClass("tag-add-red-box-shadow");
                        $(this).find(".tag-add-input").val("Too Many Tags!");
                        return;
                    }
                    const success = function() {
                        // Add tags to dat locally
                        sa.tags.push(...tag_names);
                        if (sa.needs_more_info) {
                            priority.sort({ ignore_timeout: true });
                        }
                        // Close box and add tags visually
                        $this.removeClass("open-tag-add-box");
                        transitionCloseTagBox($this);
                        for (let tag_name of tag_names) {
                            const tag = $(tag_template);
                            tag.find(".tag-name").text(tag_name);
                            tag.find(".tag-delete").click(tagDelete).attr("data-tag-deletion-name", tag_name).attr("data-assignment-id", sa.id);
                            tag.appendTo($this.parents(".tags").find(".tag-sortable-container"));

                            tag.addClass("tag-add-transition-disabler");
                            // Need to use jquery to set css for marginLeft
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
                        if (tag_names.length) {
                            $this.parents(".tags").find(".tag-sortable-container").sortable("refresh");
                        }
                    }
                    
                    // !tag_names.length to not send an ajax if removing duplicates yield an empty tag list
                    if (ajaxUtils.disable_ajax || !tag_names.length) return success();
                    const data = {
                        csrfmiddlewaretoken: csrf_token,
                        pk: sa.id,
                        tag_names: tag_names,
                        action: "tag_add",
                    }
                    $.ajax({
                        type: "POST",
                        data: data,
                        success: success,
                        error: ajaxUtils.error,
                    });
                    return;
                }
                // Tag add textbox was selected or tags were selected
                if ($this.hasClass("open-tag-add-box")) return;
                $this.addClass("open-tag-add-box");
                $this.find(".tag-add-button").removeClass("tag-add-red-box-shadow").attr("tabindex", "0");
                $this.find(".tag-add-input").focus().val("").attr("tabindex", "");
                $this.find(".tag-add-selection-item").remove();
                const container_for_tags = $this.find(".tag-add-overflow-hidden-container");
                let allTags = [];
                dat.forEach(sa => allTags.push(...sa.tags));
                for (let tag of Array.from(new Set(allTags))) {
                    const tag_add_selection_item = $(tag_add_selection_item_template);
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
                const data = {
                    csrfmiddlewaretoken: csrf_token,
                    pk: sa.id,
                    tag_names: [$this.attr("data-tag-deletion-name")],
                    action: "tag_delete",
                }
                const success = function() {
                    // Remove data locally from dat
                    sa.tags = sa.tags.filter(tag_name => !data.tag_names.includes(tag_name));
                    if (sa.needs_more_info) {
                        priority.sort({ ignore_timeout: true });
                    }
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
                }
                if (ajaxUtils.disable_ajax) return success();
                $.ajax({
                    type: "POST",
                    data: data,
                    success: success,
                    error: function() {
                        tag_wrapper.removeClass("keep-delete-open");
                        ajaxUtils.error(...arguments);
                    }
                });
            }
            $(".tag-add").focusout(function() {
                const $this = $(this);
                setTimeout(function() {
                    // const tag_add_text_clicked = $(e.currentTarget).is($this) && $(document.activeElement).hasClass("assignment");
                    if ($(document.activeElement).parents(".tag-add").length || $(document.activeElement).is($this)) return;
                    $this.removeClass("open-tag-add-box");
                    transitionCloseTagBox($this);
                }, 0);
            });
            $(".tag-sortable-container").sortable().on("sortstop", function() {
                const sa = utils.loadAssignmentData($(this));
                sa.tags = $(this).find(".tag-wrapper").filter(function() {
                    return !$(this).hasClass("tag-is-deleting");
                }).map(function() {
                    return $(this).children(".tag-name").text();
                }).toArray();
                if (sa.needs_more_info) {
                    priority.sort({ ignore_timeout: true });
                }
                ajaxUtils.SendAttributeAjaxWithTimeout("tags", sa.tags, sa.id);
            });
        },
        setKeybinds: function() {
            const screen = $("#site")[0];
            utils.form_is_showing = false;
            $(document).keydown(function(e) {
                if (e.key === "Tab") {
                    // Prevent tabbing dispositioning screen
                    setTimeout(() => screen.scrollTo(0,0), 0);
                } else if (!utils.form_is_showing && e.shiftKey /* shiftKey needed if the user presses caps lock */ && e.key === 'N') {
                    $("#image-new-container").click();
                    return false;
                } else if (e.key === "Escape") {
                    hideForm()
                } else if (e.key === "ArrowDown" && e.shiftKey) {
                    // If there is an open assignment in view, select that one and 
                    const first_open_assignment = $(".assignment.open-assignment").first();
                    if (first_open_assignment.length) {
                        var assignment_to_be_opened = first_open_assignment.parents(".assignment-container").next().children(".assignment");
                        first_open_assignment[0].scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                        });
                    } else {
                        var assignment_to_be_opened = $(".assignment").first();
                        assignment_to_be_opened[0].scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                        });
                    }
                    first_open_assignment.click();
                    if (!assignment_to_be_opened.hasClass("open-assignment")) {
                        assignment_to_be_opened.click();
                    }
                } else if (e.key === "ArrowUp" && e.shiftKey) {
                    // If there is an open assignment in view, select that one and 
                    const last_open_assignment = $(".assignment.open-assignment").last();
                    if (last_open_assignment.length) {
                        var assignment_to_be_opened = last_open_assignment.parents(".assignment-container").prev().children(".assignment");
                        if (assignment_to_be_opened.length) {
                            assignment_to_be_opened[0].scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                            });
                        }
                    } else {
                        var assignment_to_be_opened = $(".assignment").last();
                    }
                    last_open_assignment.click();
                    if (!assignment_to_be_opened.hasClass("open-assignment")) {
                        assignment_to_be_opened.click();
                    }
                    if (!last_open_assignment.length) {
                        assignment_to_be_opened[0].scrollIntoView({
                            behavior: 'smooth',
                            block: 'end',
                        });        
                    }
                }
            });
            $(".tag-add-input").keydown(function(e) {
                if (e.key === "Enter") {
                    // blur so it hides the tag add box
                    $(this).blur().parents(".tags").find(".tag-add-button").click();
                }
            });
        },
        setAssignmentScaleUtils: function() {
            // width * percent = width+10
            // percent = 1 + 10/width
            $(window).resize(() => $("#assignments-container").prop("style").setProperty('--scale-percent',`${1 + 10/$(".assignment").first().width()}`));
            $("#assignments-container").prop("style").setProperty('--scale-percent',`${1 + 10/$(".assignment").first().width()}`);
        },
        handleTutorialIntroduction: function() {
            if (enable_tutorial) {
                const assignments_excluding_example = $(".assignment").filter(function() {
                    return utils.loadAssignmentData($(this)).name !== example_assignment_name;
                });
                if (assignments_excluding_example.length) {
                    assignments_excluding_example.first().after("<span>Click your assignment<br></span>");
                } else {
                    $("#assignments-header").replaceWith('<div id="introduction-message"><div>Welcome to TimeWeb Beta! Thank you for your interest in using this app.</div><br><div>Create your first school or work assignment to get started</div></div>');
                    $(".assignment-container").hide();
                }
            }
        },
        saveAndLoadStates: function() {
            // Saves current open assignments and scroll position to localstorage and sessionstorage if refreshed or redirected
            $(window).on('onpagehide' in self ? 'pagehide' : 'unload', function() { // lighthouse says to use onpagehide instead of unload
                if (!enable_tutorial) {
                    // Save current open assignments
                    sessionStorage.setItem("open_assignments", JSON.stringify(
                        $(".assignment.open-assignment").map(function() {
                            return $(this).attr("data-assignment-id")
                        }).toArray()
                    ));
                }
                // Save scroll position
                localStorage.setItem("scroll", $("main").scrollTop());
                if (!$("#form-wrapper .hidden-field").length) {
                    sessionStorage.setItem("advanced_inputs", true);
                }
                if ($("#form-wrapper").is(":visible")) {
                    // Save form data to localStorage before unload
                    localStorage.setItem("form_fields",
                        JSON.stringify([
                            ...form_inputs.toArray().map(field => field.value),
                            $("#form-wrapper #break-days-wrapper input").toArray().map(break_day_field => break_day_field.checked),
                        ])
                    );
                }
                // Send ajax before close if it's on timeout
                if (ajaxUtils.attributeData['assignments'].length) {
                    ajaxUtils.SendAttributeAjax();
                }
            });
            if ("advanced_inputs" in sessionStorage) {
                $("#form-wrapper #advanced-inputs").click();
                sessionStorage.removeItem("advanced_inputs");
            }
            // Ensure fonts load for the graph
            document.fonts.ready.then(function() {
                // Reopen closed assignments
                if ("open_assignments" in sessionStorage) {
                    const open_assignments = JSON.parse(sessionStorage.getItem("open_assignments"));
                    ($(".question-mark").length ? $(".assignment-container.question-mark .assignment") : $(".assignment")).filter(function() {
                        return open_assignments.includes($(this).attr("data-assignment-id"))
                    }).click();
                }
                // Scroll to original position
                // Needs to be here so it scrolls after assignments are opened
                if ("scroll" in localStorage) {
                    $("main").scrollTop(localStorage.getItem("scroll"));
                    localStorage.removeItem("scroll");
                }
                if ("form_fields" in localStorage) {
                    // Restore form on refresh or invalid
                    const pr_data = JSON.parse(localStorage.getItem("form_fields"));
                    localStorage.removeItem('form_fields');
                    form_inputs.each(function(index) {
                        $(this).val(pr_data[index]);
                    });
                    $("#form-wrapper #break-days-wrapper input").each(function(index) {
                        $(this).prop('checked',pr_data[pr_data.length - 1][index]);
                    });
                }
            });
        },
    },
    daysBetweenTwoDates: function(larger_date, smaller_date) {
        return Math.round((larger_date - smaller_date) / 86400000); // Round for DST
    },
    loadAssignmentData: function($element_with_id_attribute) {
        return dat.find(assignment => assignment.id == $element_with_id_attribute.attr("data-assignment-id"));
    },
    // Resolves a resolver promise function when automatic scrolling ends
    // Scrolling detected with $("main").scroll(scroll);
    scroll: function(resolver) {
        clearTimeout(utils.scrollTimeout);
        // Runs when scroll ends
        utils.scrollTimeout = setTimeout(function() {
            $("main").off('scroll');
            resolver();
        }, 200);
    },
}

isExampleAccount = username === example_account_name// && 0;
if (isExampleAccount) {
    window.gtag = function(){};
}
ajaxUtils = {
    disable_ajax: isExampleAccount, // Even though there is a server side validation for disabling ajax on the example account, initally disable it locally to ensure things don't also get changed locally
    hour_to_update: hour_to_update,
    error: function(response, exception) {
        if (response.status == 0) {
            alert('Failed to connect');
        } else if (response.status == 404) {
            alert('Not found, try refreshing');
        } else if (response.status == 500) {
            alert('Internal server error. Please contact me if you see this');
        } else if (exception === 'parsererror') {
            alert('JSON parse failed');
        } else if (exception === 'timeout') {
            alert('Timed out, try again');
        } else if (exception === 'abort') {
            alert('Request aborted, try again');
        } else {
            $("html").html(response.responseText);
        }
    },
    changeDateNowAndExampleAssignmentDates: function() {
        if (date_now.valueOf() + 1000*60*60*(24 + ajaxUtils.hour_to_update) < new Date().valueOf()) {
            const old_date_now = new Date(date_now.valueOf());
            date_now = new Date(new Date().toDateString());
            // If this runs after midnight, set date_now to yesterday
            if (new Date().getHours() < ajaxUtils.hour_to_update) {
                date_now.setDate(date_now.getDate() - 1);
            }
            const days_since_example_ad = utils.daysBetweenTwoDates(date_now, old_date_now);
            if (isExampleAccount) {
                for (example_assignment of dat) {
                    example_assignment.assignment_date.setDate(example_assignment.assignment_date.getDate() + days_since_example_ad);
                }
            } else {
                const example_assignment = dat.find(_sa => _sa.name === example_assignment_name);
                if (example_assignment) {
                    // No need to change the due date locally because it is stored as the distance from the due date to the assignment date
                    // In this case, changing the assignment date automatically changes the due date
                    example_assignment.assignment_date.setDate(example_assignment.assignment_date.getDate() + days_since_example_ad);
                }
            }
            for (let sa of dat) {
                sa.mark_as_done = false;
            }
        }
    },
    ajaxFinishedTutorial: function() {
        if (ajaxUtils.disable_ajax) return;
        const data = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'finished_tutorial',
        }
        $.ajax({
            type: "POST",
            data: data,
            error: ajaxUtils.error,
        });
    },
    createGCAssignments: function() {
        if (ajaxUtils.disable_ajax) return;
        const data = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'create_gc_assignments',
        }
        $.ajax({
            type: "POST",
            data: data,
            error: ajaxUtils.error,
        }).done(authentication_url => {
            if (authentication_url === "No new gc assignments were added") return;
            if (authentication_url) window.location.href = authentication_url; // Invalid creds
            window.location.reload();
        });
    },
    SendAttributeAjaxWithTimeout: function(key, value, pk) {
        if (ajaxUtils.disable_ajax) return;
        // Add key and values to the data being sent
        // This way, if this function is called multiple times for different keys and values, they are all sent in one ajax rather than many smaller ones
        let sa = ajaxUtils.attributeData['assignments'].find(iter_sa => iter_sa.pk === pk);
        if (!sa) {
            sa = {pk: pk};
            ajaxUtils.attributeData['assignments'].push(sa);
        }
        sa[key] = value;
        clearTimeout(ajaxUtils.ajaxTimeout);
        ajaxUtils.ajaxTimeout = setTimeout(ajaxUtils.SendAttributeAjax, 1000);
    },
    SendAttributeAjax: function() {
        const success = function(responseText) {
            if (responseText === "RequestDataTooBig") return alert("An assignment takes up too much space and can no longer be saved");
            gtag("event","save_assignment");
        }
        // Send data along with the assignment's primary key

        // It is possible for users to send data that won't make any difference, for example they can quickly click fixed_mode twice, yet the ajax will still send
        // Coding in a check to only send an ajax when the data has changed is tedious, as I have to store the past values of every button to check with the current value
        // Plus, a pointless ajax of this sort won't happen frequently and will have a minimal impact on the server's performance
        ajaxUtils.attributeData['assignments'] = JSON.stringify(ajaxUtils.attributeData['assignments']);
        $.ajax({
            type: "POST",
            data: ajaxUtils.attributeData,
            success: success,
            error: ajaxUtils.error,
        });
        // Reset data
        ajaxUtils.attributeData = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'save_assignment',
            'assignments': [],
        }
    },
}


// Prevents submitting form on refresh
// cite 
// https://stackoverflow.com/questions/6320113/how-to-prevent-form-resubmission-when-page-is-refreshed-f5-ctrlr
if ( window.history.replaceState ) {
    window.history.replaceState( null, null, window.location.href );
}
// Load in assignment data
dat = JSON.parse(document.getElementById("assignment-models").textContent);
const max_length_funct_round = dat.length ? dat[0]['funct_round'].split(".")[1].length : undefined;
for (let sa of dat) {
    sa.assignment_date = new Date(sa.assignment_date);
    // Don't really know what to do for assignment dates on different tzs so i'll just round it to the nearest day
    // Add half a day and flooring it rounds it
    sa.assignment_date = new Date(sa.assignment_date.valueOf() + 43200000);
    sa.assignment_date.setHours(0,0,0,0);

    sa.x = utils.daysBetweenTwoDates(Date.parse(sa.x), sa.assignment_date);
    sa.y = +sa.y;
    sa.ctime = +sa.ctime;
    sa.funct_round = +sa.funct_round;
    sa.min_work_time /= sa.ctime; // Converts min_work_time to int if string or null
    sa.skew_ratio = +sa.skew_ratio;
    sa.works = sa.works.map(Number);
    sa.break_days = sa.break_days.map(Number);
    sa.tags = sa.tags || [];
}
({ warning_acceptance, def_min_work_time, def_skew_ratio, def_break_days, def_unit_to_minute, def_funct_round_minute, ignore_ends, show_progress_bar, color_priority, text_priority, enable_tutorial, date_now, highest_priority_color, lowest_priority_color, oauth_token } = JSON.parse(document.getElementById("settings-model").textContent));
def_break_days = def_break_days.map(Number);
date_now = new Date(new Date().toDateString());
if (date_now.getHours() < hour_to_update) {
    date_now.setDate(date_now.getDate() - 1);
}
highest_priority_color = utils.formatting.hexToRgb(highest_priority_color)
lowest_priority_color = utils.formatting.hexToRgb(lowest_priority_color)
// Use DOMContentLoaded because $(function() { fires too slowly on the initial animation for some reason
document.addEventListener("DOMContentLoaded", function() {
    // Define csrf token provided by backend
    csrf_token = $("form input:first-of-type").val();
    // Initial ajax data for SendAttributeAjax
    ajaxUtils.attributeData = {
        'csrfmiddlewaretoken': csrf_token,
        'action': 'save_assignment',
        'assignments': [],
    },
    ajaxUtils.changeDateNowAndExampleAssignmentDates();
    if (oauth_token.token) ajaxUtils.createGCAssignments();
    setInterval(ajaxUtils.changeDateNowAndExampleAssignmentDates, 1000*60);
    utils.ui.setClickHandlers.toggleEstimatedCompletionTimeButton();
    utils.ui.setClickHandlers.advancedInputs();
    utils.ui.setClickHandlers.headerIcons();
    utils.ui.setClickHandlers.googleClassroomAPI();
    utils.ui.setClickHandlers.deleteAllStarredAssignments();
    utils.ui.setClickHandlers.autofillAssignments();
    utils.ui.addTagHandlers();
    utils.ui.setKeybinds();
    utils.ui.setAssignmentScaleUtils();
    utils.ui.saveAndLoadStates();
    utils.ui.handleTutorialIntroduction();
});
// Lock to landscape
if (!navigator.xr && self.isMobile && screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape');
}
