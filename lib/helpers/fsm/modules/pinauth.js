'use strict';

var Q = require('q');
var util = require('util');

/**
 * A module for finite state machines that handles PIN authorization.
 *
 * @return fsm - the fsm to return
 */
function PinAuthModule() {

  var retries = 0;
  var digits = '';

  /**
   * Checks the entered PIN with the bridge PIN.
   *
   * @param {Integer} pin - the bridge PIN
   * @return {Boolean} result - true if the PIN matches
   */
  this.checkPin = function(pin) {
    return parseInt(digits) === pin;
  };

  /**
   * Concatenates a given digit to digits.
   *
   * @param {Integer} digit - the digit to add
   */
  this.addDigit = function(digit) {
    digits += digit;
  };

  /**
   * Asks the user to enter the PIN to the conference.
   *
   * @param {Object} ari - the ARI client
   * @param {Object} channel - the channel entering the PIN
   * @param {Object} bridge - the bridge the channel is trying to join
   */
  this.enterPin = function(ari, channel, bridge) {
    var playback = ari.Playback();
    var soundToPlay = util.format('sound:%s',
                                  bridge.settings.enter_pin_sound);
    var play = Q.denodeify(channel.play.bind(channel));
    play({media: soundToPlay}, playback)
      .catch(function(err) {
        console.error(err);
      })
      .done();
  };

  /**
   * Lets the user know they entered an invallid PIN. If the maximum amount
   * of retries is reached, the channel will be hung up.
   *
   * @param {Object} ari - the ARI client
   * @param {Object} channel - the channel entering the PIN
   * @param {Object} bridge - the bridge the channel is trying to join
   */
  this.invalidPin = function(ari, channel, bridge) {
    retries++;
    var playback = ari.Playback();
    var soundToPlay = util.format('sound:%s',
                                  bridge.settings.bad_pin_sound);
    var play = Q.denodeify(channel.play.bind(channel));
    play({media: soundToPlay}, playback)
      .catch(function(err) {
        console.error(err);
      })
      .done();
    if (retries > bridge.settings.pin_retries) {
      playback.once('PlaybackFinished', function (err, completedPlayback) {
        var hangup = Q.denodeify(channel.hangup.bind(channel));
        hangup()
          .catch(function (err) {
            console.error(err);
          })
          .done();
      });
    }
    digits = '';
  };

}

module.exports = PinAuthModule;
