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
        // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
        hexToRGB: function(hex) {
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
            const estimated_completion_time = new Date();
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
            toggleEstimatedCompletionTime: function() {
                // Hide and show estimated completion time
                $("#hide-button").click(function() {
                    if ($(this).html() === "Hide") {
                        $(this).html("Show");
                        $("#estimated-total-time, #current-time, #tomorrow-time").css({
                            height: 0,
                            width: 0,
                            overflow: "hidden",
                            position: "absolute",
                        });
                        localStorage.setItem("hide-button", true);
                    } else {
                        $(this).html("Hide");
                        $("#estimated-total-time, #current-time, #tomorrow-time").css({
                            height: "",
                            width: "",
                            overflow: "",
                            position: "",
                        });
                        localStorage.removeItem("hide-button");
                    }
                });
                if ("hide-button" in localStorage) {
                    $("#hide-button").click();
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
                    this.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                });
            },

            headerIcons: function() {
                // Assignments header icons
                $("#open-assignments").click(function() {
                    // Use .reverse() for gc assignemnts so the first assignment is focused
                    $(".assignment:not(.open-assignment)").reverse().click();
                });
        
                $("#close-assignments").click(function() {
                    $(".assignment.open-assignment").click();
                });
                if (isExampleAccount) {
                    $("#current-date-text").text("Example account simulated date: " + date_now.toLocaleDateString("en-US", {month: 'long', day: 'numeric', weekday: 'long', year: 'numeric'}));
                } else {
                    $("#current-date-text").text("Current date: " + date_now.toLocaleDateString("en-US", {month: 'long', day: 'numeric', weekday: 'long'}));
                }
                $("#next-day").click(function() {
                    in_next_day = true;
                    ajaxUtils.disable_ajax = true;
                    date_now.setDate(date_now.getDate() + 1);
                    for (let sa of dat) {
                        sa.mark_as_done = false;
                    }
                    $("#current-date-text").text("Simulated date: " + date_now.toLocaleDateString("en-US", {month: 'long', day: 'numeric', weekday: 'long'}));
                    priority.sort();
                });
                $("#next-day-icon-label").info("bottom",
                    `Simulates the next day for ALL assignments
                    
                    All changes made in the simulation are NOT saved, except for adding or editing assignments. Your assignments can be restored by refreshing this page`
                );
                $("#settings").click(function() {
                    window.location.href = "/settings";
                });
            },

            googleClassroomAPI: function() {
                if (!creating_gc_assignments_from_frontend && !gc_api_init_failed) {
                    if (oauth_token.token) {
                        $("#toggle-gc-label").html("Disable Google Classroom API");
                    } else {
                        $("#toggle-gc-label").html("Enable Google Classroom API");
                    }
                }
                $("#toggle-gc-container").click(function() {
                    if (isExampleAccount) {
                        $.alert({title: "You can't enable the Google Classroom API on the example account."});
                        return;
                    }
                    if (creating_gc_assignments_from_frontend) return;
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
                $("#delete-starred-assignments").click(function() {
                    $.confirm({
                        title: `Are you sure you want to delete ${$(".finished").length} starred ${pluralize("assignment", $(".finished").length)}?`,
                        content: 'This action is irreversible',
                        buttons: {
                            confirm: {
                                keys: ['Enter'],
                                action: function() {
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
                                        transitionDeleteAssignments($(".finished"), assignment_ids_to_delete);
                                    }
                                    if (ajaxUtils.disable_ajax) {
                                        success();
                                        return;
                                    }
                                    $.ajax({
                                        type: "POST",
                                        data: data,
                                        success: success,
                                        error: ajaxUtils.error,
                                    });
                                }
                            },
                            cancel: function() {
                                
                            }
                        }
                    });
                });
            },

            autofillWorkDone: function() {
                $("#autofill-work-done").click(function(e) {
                    if ($(e.target).is("#autofill-selection")) return;

                    $.confirm({
                        title: `Are you sure you want to autofill ${$("#autofill-selection").val().toLowerCase()} work done?`,
                        content: 'This action is irreversible',
                        buttons: {
                            confirm: {
                                keys: ['Enter'],
                                action: function() {
                                    const params = {};
                                    params[`autofill_${$("#autofill-selection").val().toLowerCase()}_work_done`] = true;
                                    priority.sort(params);
                                }
                            },
                            cancel: function() {
                                
                            }
                        }
                    });                    
                });
                replaceAutofillInfo();
                $("#autofill-selection").on("change", replaceAutofillInfo);
                function replaceAutofillInfo() {
                    $("#autofill-work-done .shortcut-text").find(".info-button").remove();
                    let message;
                    switch ($("#autofill-selection").val()) {
                        case "No":
                            message = "Assumes you haven't done anything since your last work input and autofills in no work done until today. This applies to ALL assignments you haven't entered past work inputs for";
                            break;
                        case "All":
                            message = "Assumes you followed your work schedule since your last work input and autofills in all work done until today. This applies to ALL assignments you haven't entered past work inputs for";
                            break;
                    }
                    $("#autofill-work-done .shortcut-text").info("bottom", message, "append").css({marginLeft: -2, left: 1, bottom: 1});
                }
            },

            deleteAssignmentsFromClass: function() {
                $(".delete-gc-assignments-from-class").click(function() {
                    const $this = $(this);
                    const dom_assignment = $this.siblings(".assignment");
                    const sa = utils.loadAssignmentData(dom_assignment);
                    const assignments_to_delete = $(".assignment-container").filter(function() {
                        const dom_assignment = $(this).children(".assignment");
                        const _sa = utils.loadAssignmentData(dom_assignment);
                        return _sa.is_google_classroom_assignment && _sa.tags[0] === sa.tags[0];
                    });
                    $.confirm({
                        title: `Are you sure you want to delete ${assignments_to_delete.length} ${pluralize("assignment", assignments_to_delete.length)} from class "${sa.tags[0]}"?<br>(An assignment's first tag is its class name)`,
                        content: 'This action is irreversible',
                        buttons: {
                            confirm: {
                                keys: ['Enter'],
                                action: function() {
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
                                        $this.off("click");
                                        transitionDeleteAssignments(assignments_to_delete, assignment_ids_to_delete);
                                    }
                
                                    if (ajaxUtils.disable_ajax) {
                                        success();
                                        return;
                                    }
                                    $.ajax({
                                        type: "POST",
                                        data: data,
                                        success: success,
                                        error: ajaxUtils.error,
                                    });
                                }
                            },
                            cancel: function() {
                                
                            }
                        }
                    });
                });
            },
        },
        addTagHandlers: function() {
            const TAG_ADD_SELECTION_ITEM_TEMPLATE = $("#tag-add-selection-item-template").html();
            const TAG_TEMPLATE = $("#tag-template").html();
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
            // might be easier to attach the click to $(document) but will do later
            $(".tag-add").click(tagAddClick);
            function tagAddClick(e) {
                const $this = $(this);
                // Close add tag box if "Add Tag" is clicked again
                if ($(e.target).hasClass("tag-add") && $this.hasClass("open-tag-add-box")) {
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
                    if (inputted_tag_name && inputted_tag_name !== "Too Many Tags!" && !tag_names.includes(inputted_tag_name)) {
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
                        // GC class tags
                        if (sa.is_google_classroom_assignment && sa.needs_more_info || tag_names.includes("Important") || tag_names.includes("Not Important")) {
                            priority.sort();
                        }
                        // Close box and add tags visually
                        $this.removeClass("open-tag-add-box");
                        transitionCloseTagBox($this);
                        for (let tag_name of tag_names) {
                            const tag = $(TAG_TEMPLATE);
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
                    }
                    
                    // !tag_names.length to not send an ajax if removing duplicates yield an empty tag list
                    if (ajaxUtils.disable_ajax || !tag_names.length) {
                        success();
                        return;
                    }
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
                // Remove duplicate tags and sort alphabetically
                const set_allTags = new Set(allTags);
                set_allTags.delete("Important");
                set_allTags.delete("Not Important");
                unique_allTags = Array.from(set_allTags).sort();
                unique_allTags.push("Important");
                unique_allTags.push("Not Important");
                for (let tag of unique_allTags) {
                    const tag_add_selection_item = $(TAG_ADD_SELECTION_ITEM_TEMPLATE);
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
                    // GC class tags
                    if (sa.is_google_classroom_assignment && sa.needs_more_info || data.tag_names.includes("Important") || data.tag_names.includes("Not Important")) {
                        priority.sort();
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
                if (ajaxUtils.disable_ajax) {
                    success();
                    return;
                }
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
            $(".tag-sortable-container").sortable({
                animation: 150,
                ghostClass: "ghost",
                direction: "horizontal",
                onEnd: function() {
                    const $this = $(this.el);
                    const sa = utils.loadAssignmentData($this);
                    sa.tags = $this.find(".tag-wrapper").filter(function() {
                        return !$(this).hasClass("tag-is-deleting");
                    }).map(function() {
                        return $(this).children(".tag-name").text();
                    }).toArray();
                    // GC class tags
                    sa.is_google_classroom_assignment && sa.needs_more_info && priority.sort();
                    ajaxUtils.sendAttributeAjaxWithTimeout("tags", sa.tags, sa.id);
                }
            });
        },
        setKeybinds: function() {
            $(document).keydown(function(e) {
                if (e.shiftKey /* shiftKey needed if the user presses caps lock */ && $(document.activeElement).prop("type") !== "text") {
                    let preventDefault = true;
                    if (e.key === 'N') {
                        if (!$("#overlay").is(":visible")) {
                            $("#image-new-container").click();
                        }
                    } else if (e.key === "E" || e.key === "D") {
                        let assignment_container = $(document.activeElement).parents(".assignment-container");
                        if (!assignment_container.length) assignment_container = $(":hover").filter(".assignment-container");
                        if (assignment_container.length) {
                            if (e.key === "E") {
                                assignment_container.find(".update-button").click();
                            } else if (e.key === "D") {
                                assignment_container.find(".delete-button").click();
                            }
                        }
                    } else {
                        preventDefault = false;
                    }
                    preventDefault && e.preventDefault(); // Prevent typing the actual letter
                } else if (e.key === "Tab") {
                    // Prevent tabbing dispositioning screen
                    setTimeout(() => $("#site")[0].scrollTo(0,0), 0);
                } else if (e.key === "Escape") {
                    hideForm();
                } else if (e.key === "ArrowDown") {
                    if (e.shiftKey) {
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
                    } else if ($(".open-assignment").length !== 0) {
                        // Prevent arrow scroll
                        e.preventDefault();
                    }
                } else if (e.key === "ArrowUp") {
                    if (e.shiftKey) {
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
                    } else if ($(".open-assignment").length !== 0) {
                        // Prevent arrow scroll
                        e.preventDefault();
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
            // width * percentx = width+10
            // percentx = 1 + 10/width
            $(window).resize(function() {
                $("#assignments-container").prop("style").setProperty('--scale-percent-x',`${1 + 10/$(".assignment").first().width()}`);
                $(".assignment").each(function() {
                    priority.positionTags($(this));
                });
            });

            // height * percenty = height+5
            // percenty = 1 + 5/height
            $("#assignments-container").prop("style").setProperty('--scale-percent-x',`${1 + 10/$(".assignment").first().width()}`);
            setTimeout(function() {
                $(".assignment").each(function() {
                    if (1 + 10/$(this).height() > 1.05) return;
                    $(this).prop("style").setProperty('--scale-percent-y',`${1 + 10/$(this).height()}`);
                });
            }, 0);
        },
        handleTutorialIntroduction: function() {
            if (enable_tutorial) {
                const assignments_excluding_example = $(".assignment").filter(function() {
                    return utils.loadAssignmentData($(this)).name !== example_assignment_name;
                });
                if (assignments_excluding_example.length) {
                    assignments_excluding_example.first().after("<span>Click your assignment to open it<br></span>");
                } else {
                    $("#assignments-header").replaceWith('<div id="introduction-message"><div>Welcome to TimeWeb Beta! Thank you for your interest in using this app.</div><br><div>Create your first school or work assignment to get started</div></div>');
                    $(".assignment-container").hide();
                }
            }
        },
        graphAlertTutorial: function(days_until_due) {
            $.alert({
                title: "Welcome to the graph, a visualization of your assignment's entire work schedule. It is highly recommended to read TimeWeb's <a href=\"/user-guide#assignment-graph\">user guide for the graph</a> to understand how to use it.<br><br>Once you're finish reading that, click OK to disable this popup and then check out the settings to set your preferences.",
                content: days_until_due <= 2 ? `Note: since this assignment is due in only ${days_until_due} ${pluralize("day", days_until_due)}, there isn't much to display on the graph. Check out the example assignment or the example account to see how TimeWeb handles assignments with longer due dates.` : '',
                backgroundDismiss: false,
                alignTop: true, // alignTop is a custom extension
                onClose: function() {
                    enable_tutorial = false;
                    ajaxUtils.ajaxFinishedTutorial();
                }
            });
        },
        exampleAccountAlertTutorial: function() {
            if (sessionStorage.getItem("already-alerted-example-account")) return;
            sessionStorage.setItem("already-alerted-example-account", true);
            $.alert({
                title: "Hey there! Thanks for checking out the example account. Here, you'll get a clear view of how you should expect your schedule to look like<br><br>A few things to note:<br>The example account's internal date is frozen at May 3, 2021 for consistency, and no modifications to this account are saved<br><br>With that out of the way, feel free to do whatever you want over here."
            });
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
                // Send ajax before close if it's on timeout
                if (ajaxUtils.attributeData['assignments'].length) {
                    ajaxUtils.sendAttributeAjax();
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
                    $(".assignment").filter(function() {
                        return open_assignments.includes($(this).attr("data-assignment-id"));
                    }).click();
                }
                // Scroll to original position
                // Needs to be here so it scrolls after assignments are opened
                if ("scroll" in localStorage) {
                    $("main").scrollTop(localStorage.getItem("scroll"));
                    localStorage.removeItem("scroll");
                }
            });
        },
        scaleGoogleClassroomAPIIconOnMobile: function() {
            $("#toggle-gc-container").addClass("scale-on-mobile");
        }
    },
    after_midnight_hour_to_update: after_midnight_hour_to_update,
    previous_time: new Date(),
    reloadAfterMidnightHourToUpdate: function() {
        // Don't reload in the next day to preserve changes made in the simulation
        // Don't reload in the example account because date_now set in the example account causes an infinite reload loop
        if (window.in_next_day || isExampleAccount) return;
        const current_time = new Date();
        if (utils.previous_time.getHours() < utils.after_midnight_hour_to_update && current_time.getHours() >= utils.after_midnight_hour_to_update) {
            window.location.reload();
        }
        utils.previous_time = current_time;
    },
    loadAssignmentData: function($element_with_id_attribute) {
        return dat.find(assignment => assignment.id == $element_with_id_attribute.attr("data-assignment-id"));
    },
    // Resolves a promise function when automatic scrolling ends
    // Scrolling detected with $("main").scroll(utils.scroll);
    scroll: function(resolver) {
        clearTimeout(utils.scrollTimeout);
        // Runs when scroll ends
        utils.scrollTimeout = setTimeout(function() {
            $("main").off('scroll');
            resolver();
        }, 200);
    },
}

isExampleAccount = username === example_account_name || editing_example_account;
ajaxUtils = {
    disable_ajax: isExampleAccount && !editing_example_account, // Even though there is a server side validation for disabling ajax on the example account, initally disable it locally to ensure things don't also get changed locally
    error: function(response, exception) {
        if (response.status == 0) {
            $.alert({title: "Failed to connect.", content: "We can't establish a connection with the server. Check your connection and try again."});
        } else if (response.status == 404) {
            $.alert({title: "Not found.", content: "Try refreshing or trying again."});
        } else if (response.status == 500) {
            $.alert({title: "Internal server error.", content: "Please <a target='_blank' href='mailto:arhan.ch@gmail.com'>contact me</a> if you see this."});
        } else if (exception === 'timeout' || response.status == 502) {
            $.alert({title: "Request timed out.", content: "You're probably seeing this because something took too long while connecting with the server. Try refreshing or try again."});
        } else if (exception === 'abort') {
            $.alert({title: "Request aborted.", content: "Try refreshing or try again."});
        } else {
            $.alert({title: "<p>Uncaught error while trying to connect with the server:</p>" + response.responseText});
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
        if (ajaxUtils.disable_ajax || !creating_gc_assignments_from_frontend) return;
        const data = {
            'csrfmiddlewaretoken': csrf_token,
            'action': 'create_gc_assignments',
        }
        $.ajax({
            type: "POST",
            data: data,
            error: ajaxUtils.error,
        }).done(function(authentication_url) {
            if (authentication_url === "No new gc assignments were added") {
                $("#toggle-gc-label").html("");
                $("#toggle-gc-container").removeClass("open");
                if (oauth_token.token) {
                    $("#toggle-gc-label").html("Disable Google Classroom API");
                } else {
                    $("#toggle-gc-label").html("Enable Google Classroom API");
                }
                creating_gc_assignments_from_frontend = false;
                return;
            }
            if (authentication_url) window.location.href = authentication_url; // Invalid creds
            window.location.reload();
        });
    },
    sendAttributeAjaxWithTimeout: function(key, value, pk) {
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
        ajaxUtils.ajaxTimeout = setTimeout(ajaxUtils.sendAttributeAjax, 1000);
    },
    sendAttributeAjax: function() {
        const success = function(responseText) {
            if (responseText === "RequestDataTooBig") {
                $.alert({title: "An assignment takes up too much space and can no longer be saved.", content: "An assignment has too many work inputs. Try changing its assignment date to today to reset its work inputs"});
                return;
            }
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
// https://stackoverflow.com/questions/6320113/how-to-prevent-form-resubmission-when-page-is-refreshed-f5-ctrlr
if ( window.history.replaceState ) {
    window.history.replaceState( null, null, window.location.href );
}
({ def_min_work_time, def_skew_ratio, def_break_days, def_unit_to_minute, def_funct_round_minute, ignore_ends, show_progress_bar, color_priority, text_priority, enable_tutorial, date_now, highest_priority_color, lowest_priority_color, oauth_token, horizontal_tag_position, vertical_tag_position } = JSON.parse(document.getElementById("settings-model").textContent));
def_break_days = def_break_days.map(Number);
date_now = new Date();
if (date_now.getHours() < utils.after_midnight_hour_to_update) {
    date_now.setDate(date_now.getDate() - 1);
}
date_now = new Date(date_now.toDateString());
highest_priority_color = utils.formatting.hexToRGB(highest_priority_color);
lowest_priority_color = utils.formatting.hexToRGB(lowest_priority_color);
if (isExampleAccount) {
    window.gtag = function(){};
    date_now = new Date(2021, 4, 3);
}
// Load in assignment data
dat = JSON.parse(document.getElementById("assignment-models").textContent);
const max_length_funct_round = dat[0]['funct_round'] ? dat[0]['funct_round'].split(".")[1].length : undefined;
for (let sa of dat) {
    if (sa.assignment_date) {
        sa.assignment_date = new Date(sa.assignment_date);
        // Don't really know what to do for assignment dates on different tzs (since they are stored in utc) so i'll just round it to the nearest day
        // Add half a day and flooring it rounds it
        sa.assignment_date = new Date(sa.assignment_date.valueOf() + 12*60*60*1000);
        sa.assignment_date.setHours(0,0,0,0);
    }
    if (sa.x) {
        sa.x = new Date(sa.x);
        sa.x = new Date(sa.x.valueOf() + 12*60*60*1000);
        sa.x.setHours(0,0,0,0);
        sa.x = mathUtils.daysBetweenTwoDates(sa.x, sa.assignment_date);
        if (sa.name === example_assignment_name) {
            sa.assignment_date = new Date(date_now.valueOf());
        }
    }
    if (sa.y) sa.y = +sa.y;
    if (sa.time_per_unit) sa.time_per_unit = +sa.time_per_unit;
    if (sa.funct_round) sa.funct_round = +sa.funct_round;
    if (sa.min_work_time) sa.min_work_time /= sa.time_per_unit; // Converts min_work_time to int if string or null
    if (sa.skew_ratio) sa.skew_ratio = +sa.skew_ratio;
    if (sa.works.length) sa.works = sa.works.map(Number);
    sa.break_days = sa.break_days.map(Number);
    sa.tags = sa.tags || [];

    const red_line_start_x = sa.fixed_mode ? 0 : sa.dynamic_start; // X-coordinate of the start of the red line
    const red_line_start_y = sa.fixed_mode ? 0 : sa.works[red_line_start_x - sa.blue_line_start]; // Y-coordinate of the start of the red line

    // Repopulating the form
    sa.original_funct_round = sa.funct_round;
    sa.original_min_work_time = sa.min_work_time;
    // Caps and adjusts min_work_time and funct_round; needed in parabola.js i think
    let y1 = sa.y - red_line_start_y;
    if (Number.isFinite(sa.min_work_time) && Number.isFinite(sa.funct_round) && Number.isFinite(y1)) {
        if (sa.funct_round > y1 && y1) { // && y1 to ensure funct_round isn't 0, which causes Assignment.funct to return NaN
            sa.funct_round = y1;
        }
        if (sa.min_work_time > y1) {
            sa.min_work_time = y1;
        }

        // If funct_round is greater than min_work_time, every increase in work already fulfills the minimum work time
        // Set it to 0 to assume it isn't enabled for calculations in setParabolaValues()
        if (sa.min_work_time <= sa.funct_round) {
            sa.min_work_time = 0;
        }
    }
};
// Use DOMContentLoaded because $(function() { fires too slowly
document.addEventListener("DOMContentLoaded", function() {
    // Define csrf token provided by backend
    csrf_token = $("form input:first-of-type").val();
    // Initial ajax data for sendAttributeAjax
    ajaxUtils.attributeData = {
        'csrfmiddlewaretoken': csrf_token,
        'action': 'save_assignment',
        'assignments': [],
    },
    utils.reloadAfterMidnightHourToUpdate();
    if (oauth_token.token) ajaxUtils.createGCAssignments();
    setInterval(utils.reloadAfterMidnightHourToUpdate, 1000*60);
    utils.ui.setClickHandlers.toggleEstimatedCompletionTime();
    utils.ui.setClickHandlers.advancedInputs();
    utils.ui.setClickHandlers.headerIcons();
    utils.ui.setClickHandlers.googleClassroomAPI();
    utils.ui.setClickHandlers.deleteAllStarredAssignments();
    utils.ui.setClickHandlers.autofillWorkDone();
    if (isExampleAccount) {
        utils.ui.exampleAccountAlertTutorial();
    }
    if (isMobile) {
        utils.ui.scaleGoogleClassroomAPIIconOnMobile();
    }
    utils.ui.addTagHandlers();
    utils.ui.setKeybinds();
    utils.ui.setAssignmentScaleUtils();
    utils.ui.saveAndLoadStates();
    utils.ui.handleTutorialIntroduction();
});