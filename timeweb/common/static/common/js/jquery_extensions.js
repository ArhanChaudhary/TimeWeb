(function($) {
    if (!$) return;

    $.fn.reverse = Array.prototype.reverse;
    // Info tooltip
    $.fn.info = function(facing,text,position) {
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
                return info_button.prependTo(this);
            case "after":
                return info_button.insertAfter(this);
            default:
                return info_button.appendTo(this);
        }
    }
    $.fn.hasOverflown = function() {
        const e = this[0];
        if (!e) return false;
        return e.scrollHeight > e.clientHeight || e.scrollWidth > e.clientWidth;
    }
    $.fn.isFullyScrolled = function(params={}) {
        const e = this[0];
        return e.scrollTop + e.clientHeight + params.leeway >= e.scrollHeight;
    }
    $.fn.expandableTextareaHeight = function() {
        $(this).on("input", function() {
            if ($(this).val().includes("\n")) {
                // TODO: what the heck is e8f6a9f
                // Use 0 instead of "auto" because firefox
                // $(this).css("height", 0);
                
                $(this).css("height", "auto"); // Needed for expanding with text
                $(this).css("height", this.scrollHeight);
            } else {
                $(this).css("height", $(this).css("--nothing-height"));
            }

        // there's sometimes a random scrollbar
        }).css("overflow-y", "hidden");
        return $(this);
    }
    // Only change text
    $.fn.onlyText = function(text) {
        $(this).contents().filter(function() {
            return this.nodeType === Node.TEXT_NODE;
        }).first()[0].nodeValue = text;
        return $(this);
    }
    $.fn.getPseudoStyle = function(pseudo, style) {
        const ret = window.getComputedStyle(this[0], pseudo)[style];
        if (Number.isFinite(parseFloat(ret))) return parseFloat(ret);
        return ret;
    }
})(window.$);