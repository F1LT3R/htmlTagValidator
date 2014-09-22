var htmlTagValidator = function() {
  var startingTagFirstChar = "<",
      startingTagLastChar = ">",
      closingTagSecondChar = "/",
      selfClosingTagSecondToLastChar = "/",
      commentSecondCharacter = "!",
      doctypeSecondCharacterPattern = new RegExp("[dD]"),
      startTagPattern = new RegExp("[a-z0-9-]"),
      commentPattern = new RegExp("^<!--.*-->"),
      doctypePattern = new RegExp("^<!doctype\s.*", "i");
  
  var parserFunc, previousParserFunc, currentTagName, startingTags,
      characterIndex, currentComment, options;

  var selfClosing = [
  	"area",
    "base",
    "br",
    "col",
    "command",
    "embed",
    "hr",
    "img",
    "input",
    "keygen",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
  ]

  var ignoreWithin = [
  	"pre",
  	"code",
  	"textarea",
  	"script",
    "style"
  ]

  var tagObject = function(lIndex, cIndex) {
  	return {name: currentTagName, line: lIndex + 1, char: cIndex};
  }
  
  var throwEndingTagError = function(tagObj) {
    var newError = new Error("Ending tag not found for: " + tagObj.name + " at line: " + tagObj.line + " char: " + tagObj.char)
    newError.lineData = tagObj;
    throw newError;
  }
  
  var throwEndingCommentError = function(commentObj) {
    var newError = new Error("Comment ending not found for: `comment` at line: " + commentObj.line + " char: " + commentObj.char)
    newError.lineData = commentObj;
    throw newError;
  }
  
  var throwSelfClosingFormatError = function(tagObj) {
    var newError = new Error("Ending `/` not found for: `"+ tagObj.name +"` at line: " + tagObj.line + " char: " + tagObj.char)
    newError.lineData = tagObj.name;
    throw newError;
  }
  
  var setParserFunc = function(func) {
    previousParserFunc = parserFunc;
    parserFunc = func;
  }
  
  var goBackNumChars = function(num) {
    characterIndex -= num;
  }
  
  // Handle starting html tags
  var startingTagNameFinder = function startingTagNameFinder(character, lIndex, cIndex) {
    // If the character matches the matcher for approved tag name characters add it to
    // the currentTagName
  	if(startTagPattern.test(character)) {
  		currentTagName += character
    // If the character matches the closing tag second character set the finder function
    // to the endingTagNameFinder
  	} else if(character === closingTagSecondChar) {
      setParserFunc(endingTagNameFinder);
    // If the character looks like a commentSecondCharacter(!) then check to see if it's
    // really a comment or a comment with the commentOrDoctypeFinder
    } else if(character === commentSecondCharacter) {
      currentTagName = ""
      setParserFunc(commentOrDoctypeFinder);
      
      // If the current tag name is a self closing tag, start looking for a new
      // tag name with startingTagBeginningFinder
  	} else if(selfClosing.indexOf(currentTagName) >= 0){
      if(options['strict_self_closing_tags']) {
        setParserFunc(selfClosingEndingSlashFinder);
      } else {
        currentTagName = "";
        setParserFunc(startingTagBeginningFinder);
      }
      
      // If nothing else trips a check, the record the currentTag name and either:
      //   ignore all the contents of the tag is an ignoredWithin tag (script, style, pre, etc)
      // or
      //   start looking for the matching ending tag.
    } else {
  		tagObj = tagObject(lIndex, cIndex)
  		startingTags.push(tagObj)
  	  
      if(ignoreWithin.indexOf(currentTagName) >= 0){
        currentTagName = "";
        goBackNumChars(1)
        setParserFunc(ignoredWithinEndingTagStartFinder);
      } else {
        currentTagName = "";
        goBackNumChars(1);
        setParserFunc(startingTagEndingFinder);
      }
  	}
  }

  var selfClosingEndingSlashFinder = function selfClosingEndingSlashFinder(character, lIndex, cIndex) {
    if(character === selfClosingTagSecondToLastChar) {
      currentTagName = '';
      setParserFunc(endingTagBeginningFinder);
    } else if(character === startingTagLastChar) {
      throwSelfClosingFormatError(tagObject(lIndex, cIndex));
    }
  }

  var startingTagEndingFinder = function startingTagEndingFinder(character, lIndex, cIndex) {
  	if(character === startingTagLastChar) {
      setParserFunc(endingTagBeginningFinder);
  	}
  }

  var startingTagBeginningFinder = function startingTagBeginningFinder(character, lIndex, cIndex) {
  	if(character === startingTagFirstChar) {
      setParserFunc(startingTagNameFinder);
  	}
  }

  var endingTagNameFinder = function endingTagNameFinder(character, lIndex, cIndex) {
  	if(startTagPattern.test(character)) {
  		currentTagName += character
  	} else {
  		var lastStartTag = startingTags.pop();

  		if(lastStartTag.name === currentTagName) {
        setParserFunc(startingTagBeginningFinder);
  		} else {
        throwEndingTagError(lastStartTag)
  		}
  		currentTagName = ""
  	}
  }

  var endingTagSlashFinder = function endingTagSlashFinder(character, lIndex, cIndex) {
  	if(character === closingTagSecondChar) {
      setParserFunc(endingTagNameFinder);
  	} else {
      goBackNumChars(1)
      setParserFunc(startingTagNameFinder);
  	}
  }

  var endingTagBeginningFinder = function endingTagBeginningFinder(character, lIndex, cIndex) {
  	if(character === startingTagFirstChar) {
      setParserFunc(endingTagSlashFinder);
  	}
  }
  
  // Ignore with ignored tag list ex. pre, script, code
  var ignoredWithinEndingTagStartFinder = function ignoredWithinEndingTagStartFinder(character, lIndex, cIndex) {
    if(character === startingTagFirstChar) {
      setParserFunc(ignoredWithinEndingTagSlashFinder);
    }
  }
  
  var ignoredWithinEndingTagSlashFinder = function ignoredWithinEndingTagSlashFinder(character, lIndex, cIndex) {
    if(character === closingTagSecondChar) {
      setParserFunc(ignoredWithinEndingTagNameFinder);
    }
  }
  
  var ignoredWithinEndingTagNameFinder = function ignoredWithinEndingTagNameFinder(character, lIndex, cIndex) {
    if(startTagPattern.test(character)) {
      currentTagName += character
    } else {
      var lastStartTag = startingTags.pop();

      if(lastStartTag.name === currentTagName) {
        setParserFunc(startingTagBeginningFinder);
      } else {
        throwEndingTagError(lastStartTag)
      }
      currentTagName = ""
    }
  }
  
  // Comments and doctypes both start with `<!` So we needed a custom finder to determine what it
  // really is. If it's a doctype we want to ignore it and look for a new starting tag character,
  // while if it's a comment, we want to look for a full comment.
  var commentOrDoctypeFinder = function commentOrDoctypeFinder(character, lIndex, cIndex) {
    if (doctypeSecondCharacterPattern.test(character)) {
      currentTagName = ""
      setParserFunc(startingTagBeginningFinder)
    } else {
      goBackNumChars(3);
      setParserFunc(commentFinder)
    }
  }

  // comment finding
  // Look through the incoming characters until a full matching comment has been built,
  // then reset the finder back to the startingTagBeginningFinder and clear the currentComment 
  var commentFinder = function commentFinder(character, lIndex, cIndex) {
    if(!currentComment) {
      currentComment = {content: "", line: lIndex + 1, char: cIndex + 1, name: "comment"}
    }

    currentComment.content += character;  

    if(commentPattern.test(currentComment.content)) {
      currentComment = null;
      setParserFunc(startingTagBeginningFinder);
    }
  }
  
  // Main entry point to the validator, it starts with the `startingTagBeginningFinder` first
  var checkTags = function(string, opts) {
    var lines = string.split("\n");
    setParserFunc(startingTagBeginningFinder);
    currentTagName = "";
    startingTags = [];
    currentComment = null;
    options = opts || {};

  	for(var lineIndex=0, l = lines.length; lineIndex < l; lineIndex++) {
  		for(characterIndex=0, ll=lines[lineIndex].length; characterIndex < ll; characterIndex++) {
  			if(!parserFunc) {break;}

  			parserFunc(lines[lineIndex][characterIndex], lineIndex, characterIndex)
  		}
  	}
  	
    // currentComment gets cleared whenever a complete comment is found, so if the loops end and one still
    // exists, we can assume that it was never closed.
    if(currentComment) {
      throwEndingCommentError(currentComment);
    
    // The startTags array populates when a starting tag is found, but pops back out when
    // matching ending tags are found. If there are any starting tags left at the end of
    // the loop we can assume that the ending tag was never found and throw and error
    // for the last tag in the array.
    } else if(startingTags.length > 0) { 
  		var lastStartTag = startingTags[startingTags.length - 1];
  		throwEndingTagError(lastStartTag);
  	}
  }

  return checkTags;
}

if(module && module.exports) {
  module.exports = htmlTagValidator()
} else {
  window.htmlTagValidator = htmlTagValidator();
}
