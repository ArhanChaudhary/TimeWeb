(function($) {
    if (!$) return;

    $.fn.reverse = Array.prototype.reverse;
    // Info tooltip
    $.fn.info = function(facing,text,position) {
        const info_button = $($("#info-button-template").html());
        info_button.find(".info-button-text").addClass(`info-${facing}`).text(text);
        info_button.click(() => false);
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
            $(this).css("height", "auto"); // Needed for expanding with text
            // Dunno where +2 comes from but it works
            $(this).css("height", $(this).prop("scrollHeight") + 2);
        });
        return $(this);
    }
    // Only change text
    $.fn.onlyText = function(text) {
        $(this).contents().filter(function() {
            return this.nodeType === Node.TEXT_NODE;
        }).first()[0].nodeValue = text;
        return $(this);
    }
    $.fn.getCSSProperty = function(property) {
        return parseFloat(window.getComputedStyle(this[0]).getPropertyValue(property));
    }
    $.fn.getPseudoStyle = function(pseudo, style) {
        const ret = window.getComputedStyle(this[0], pseudo)[style];
        if (Number.isFinite(parseFloat(ret))) return parseFloat(ret);
        return ret;
    }
})(window.$);