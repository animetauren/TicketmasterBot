// ==UserScript==
// @name         TicketMasterBuy
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Fast execution of reserving tickets in cart
// @match        https://www.ticketmaster.co.uk/*event/*
// @match        https://www1.ticketmaster.co.uk/*event/*
// @match        https://www.ticketmaster.com/*event/*
// @match        https://www1.ticketmaster.com/*event/*
// @match        https://concerts1.livenation.com/*event/*
// @match        https://concerts1.livenation.com/*event/*
// @match        https://www.ticketmaster.ie/*event/*
// @match        https://www1.ticketmaster.ie/*event/*
// @require      https://code.jquery.com/jquery-2.1.3.min.js
// @grant        none
// ==/UserScript==


var refreshIntervalSecondsMin=1; //Set this to how often you want to check for tickets (Note: Do this too fast and TicketMaster may block your ip address)
var refreshIntervalSecondsMax=5;
var numberOfTickets=2; //Set this to the number of tickets you want.  We should prob test out various amounts to see which amounts we should try for.


function getAllCookieNames() {
  var pairs = document.cookie.split(";");
  var cookies = [];
  for (var i=0; i<pairs.length; i++){
    var pair = pairs[i].split("=");
    cookies.push((pair[0]+'').trim())
  }
  return cookies;
}

function deleteAllCookies() {
    getAllCookieNames().map(function(cname) {
        document.cookie = cname+'=;expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    })
}

function SkipPopup()
{
    var popupPresent = getElementByXpath('//button[@class = "modal-dialog__button landing-modal-footer__skip-button"]');
    if(popupPresent)
    {
        try{ popupPresent.click();}catch(ex){}
    }
}

function CheckForFilterPanel(){
    var filterBar = getElementByXpath('//div[@class = "filter-bar__content"]');
    return filterBar;
}

function ProcessFilterPanel(filterBar){
    // We can update this depending on group preferences.
    // For, we only select Standard Tickets and select Best Available.
    // TODO: All these listeners were added haphazardly in testing, I doubt the sequence of actions is as expected
    // (e.g. select filters then select sort order then select quantity then buy).
    // TODO: Kristine is interested in "soundcheck" packages - we won't know the exact name of the package
    // ahead of time but can prob do a fuzzy string match.  See the Chainsmokers concert for an example of
    // soundcheck packages: https://www1.ticketmaster.com/the-chainsmokers5-seconds-of-summerlennon-stella-world-war-joy-tour/event/02005646C6716EBF

    //Click ticket type icon
    ClickElement('//*[@id="filter-bar-ticket"]/div[1]/div')
    //Clear all filters
    ClickElement('//*[@id="filter-bar-ticket"]/div[2]/div/div[2]/div/div/span[3]/button')
    //Select standard tickets checkbox
    // TODO this is brittle as Standard Tickets can be any element of list of options.  Should do a more robust search
    ClickElement('//*[@id="000000000001-box-1"]')
    //Close ticket type menu
    ClickElement('//*[@id="filter-bar-ticket"]/div[1]/div')

    // TODO: This is dumb.  We should just waitForElement on the correct filter panel element
    setTimeout(function(){
        //Select best available
        ClickElement('//*[@id="quickpicks-module"]/div[1]/div/span[3]')

        // TODO: This is dumb.  We should just waitForElement on the correct filter panel element
        setTimeout(function(){
            //Click first ticket result in list
            ClickElement('(//ul/li[@class = "quick-picks__list-item"])[1]/div/div');
        }, 1000)
    }, 1000);

    // TODO Dismiss price fluctuation popup

    //Change ticket quantity (if applicable)
    waitForElement('.offer-card', function() {

        //Change the number of tickets (if applicable);
        ChangeTicketQuantity();

        //Click the button to Buy the tickets (right hand panel)
        var getTicketsElement = ClickElement('//button[@id = "offer-card-buy-button"]');

        //Sometimes a dialog comes up if someone else beat us to the tickets.
        //This dialog gives a recommendation for a new seat selection.
        //If this occurs, we choose to accept the new seats.
        waitForElement('.button-aux, .modal-dialog__button', function() {
          var sectionChangeBuyButton = getElementByXpath('//button[@class = "button-aux modal-dialog__button"]');
          sectionChangeBuyButton.click();
        });

        // Experimental - this is intended to listen for a pop-up that usually appears when we're blocked.
        // Note - don't think the element selector works.
        // TODO: clear cookies
        waitForElement('.error__main-message-header'), function() {

        }
        // TODO: test for and deal with any other popups that may arise on the ticket selection page.
    });
}

function ChangeTicketQuantity()
{
        var rightPanelCurrentTicketCountElement = getElementByXpath('//div[@class = "qty-picker__number qty-picker__number--lg"]');

        var currentTicketCount = rightPanelCurrentTicketCountElement.innerText;

        var ticketQuantityDifference = numberOfTickets - currentTicketCount;
        if (ticketQuantityDifference > 0)
        {
            var ticketIncrementElement = getElementByXpath('//button[@class = "qty-picker__button qty-picker__button--increment qty-picker__button--sm"]');
            for (var i = 0; i < ticketQuantityDifference; i++)
            {
                try{ticketIncrementElement.click();}catch(ex){}
            }
        }
        else if(ticketQuantityDifference < 0)
        {
            ticketQuantityDifference = Math.abs(ticketQuantityDifference);
            var ticketDecrementElement = getElementByXpath('//button[@class = "qty-picker__button qty-picker__button--decrement qty-picker__button--sm"]');
            for (var i = 0; i < ticketQuantityDifference; i++)
            {
                try{ticketDecrementElement.click();}catch(ex){}
            }
        }
}

function CheckForGeneralAdmission()
{
    var BuyButton = getElementByXpath('//button[@id = "offer-card-buy-button"]');
    return BuyButton;
}

function ProcessGeneralAdmission(generalAdmissionBuyButton)
{
    ChangeTicketQuantity();
    generalAdmissionBuyButton.click();
}

function reload() {
    window.top.document.location.replace(window.top.document.location.href);
}


function ClickElement(path, time)
{
    var element = getElementByXpath(path);
    if(element !== null) {
        if (typeof element.click != 'undefined')
        {
            element.click();
            return element;
        }
    }
}

function getElementByXpath(path)
{
  return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

var waitForElement = function(selector, callback)
{
  if (jQuery(selector).length) {
    callback();
  } else {
    setTimeout(function() {
      waitForElement(selector, callback);
    }, 100);
  }
};

$(document).ready(function()
{
    var success=false;
    //This popup dialog seems to happen in the US ticketmaster website
    //We just close it down and continue as normal
    SkipPopup();

    //Ticket type 1
    //This occurs in the majority of ticket sales when there is a selection of ticket types
    if(!success)
    {
        var filterBar = CheckForFilterPanel();
        if(filterBar)
        {
            console.log('These tickets have a filter bar');
            success=true;
            ProcessFilterPanel(filterBar);
        }
    }

    //Ticket type 2
    //These tickets are General Admission and do not have assigned seating (i.e. no filter bar)
    if(!success)
    {
        var generalAdmissionBuyButton = CheckForGeneralAdmission();
        if(generalAdmissionBuyButton)
        {
            console.log('These tickets are General Admission');
            success=true;
            ProcessGeneralAdmission(generalAdmissionBuyButton);
        }
    }

    //TODO: Add more ticket types if found

    if(!success)
    {
        //refresh the page after a random interval between refreshIntervalSecondsMin and refreshIntervalSecondsMax (Tickets weren't yet on sale)
        setTimeout(function(){deleteAllCookies();reload();}, refreshIntervalSecondsMin * 1000 + Math.random() * (refreshIntervalSecondsMax - refreshIntervalSecondsMin) * 1000);
    }
});
