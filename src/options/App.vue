<template>
  <div>
    <div class="container">
      <h1>Configuration page for mini-gestures</h1>
    </div>

    <div class="container">
      <div class="six columns">
        <table class="optiontable u-max-full-width">
          <thead>
            <tr>
              <th>OPTION NAME</th>
              <th>VALUE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Debug On</td>
              <td>
                <div class="onoffswitch">
                  <input
                    type="checkbox"
                    id="debug"
                    class="onoffswitch-checkbox"
                    v-model="form.debug"
                  />
                  <label class="onoffswitch-label" for="debug">
                    <span class="onoffswitch-inner"></span>
                    <span class="onoffswitch-switch"></span>
                  </label>
                </div>
              </td>
            </tr>
            <tr>
              <td>Rocker Gestures On</td>
              <td>
                <div class="onoffswitch">
                  <input
                    type="checkbox"
                    id="rocker"
                    class="onoffswitch-checkbox"
                    v-model="form.rocker"
                  />
                  <label class="onoffswitch-label" for="rocker">
                    <span class="onoffswitch-inner"></span>
                    <span class="onoffswitch-switch"></span>
                  </label>
                </div>
              </td>
            </tr>

            <tr>
              <td>Show Gesture Trails</td>
              <td>
                <div class="onoffswitch">
                  <input
                    type="checkbox"
                    id="trail"
                    class="onoffswitch-checkbox"
                    v-model="form.trail"
                  />
                  <label class="onoffswitch-label" for="trail">
                    <span class="onoffswitch-inner"></span>
                    <span class="onoffswitch-switch"></span>
                  </label>
                </div>
              </td>
            </tr>

            <tr>
              <td>Gesture Color</td>
              <td>
                <select v-model="color">
                  <option value="red">red</option>
                  <option value="green">green</option>
                  <option value="blue">blue</option>
                  <option value="orange">orange</option>
                </select>
              </td>
            </tr>
            <tr>
              <td>Gesture Width</td>
              <td>
                <select v-model="form.width">
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
        <div>{{ status }}</div>
        <div class="row">
          <div>
            <button class="button-primary" @click="save_options">
              Save Config
            </button>
          </div>
          <div>
            <button class="button-danger" @click="resetOptions">
              Reset Config
            </button>
          </div>
        </div>
        <p style="margin-top: 10px">
          Note: valid gestures shorcuts are <strong>U</strong> (up),
          <strong>D</strong> (down), <strong>L</strong> (left) and
          <strong>R</strong> (right) and their combinations.
        </p>
      </div>

      <div class="six columns">
        <table class="optiontable u-max-full-width">
          <thead>
            <tr>
              <th>ACTION</th>
              <th>GESTURE</th>
            </tr>
            <tr v-for="(value, key) in commandTrans" :key="key">
              <td>
                {{ key }}
              </td>
              <td align="center">
                <input type="text" v-model="form[value]" />
              </td>
            </tr>
          </thead>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, ref, onBeforeMount } from "vue";
import browser from "webextension-polyfill";

import { commandTrans, type CommandTransKey } from "../action";
import { invertHash } from "../utils";

defineComponent({
  name: "App",
});

const colorCodes: Record<string, string> = {
  red: "ff3300",
  green: "008000",
  blue: "00FFFF",
  yellow: "FFFF00",
};

const colorNames = {
  ff3300: "red",
  "008000": "green",
  "00FFFF": "blue",
  FFFF00: "yellow",
};

const defaultGests = { U: "newtab", R: "forward", L: "back", UD: "closetab" };

interface Form extends Partial<Record<CommandTransKey, string>> {
  width: string;
  rocker: boolean;
  trail: boolean;
  debug: boolean;
}

const form = ref<Form>({
  width: "3",
  rocker: true,
  trail: true,
  debug: false,
});
const status = ref("");
const color = ref<string>("red");

function showStatus(msg: string) {
  status.value = msg;
  setTimeout(function () {
    status.value = "";
  }, 750);
}

async function resetOptions() {
  await browser.storage.sync.clear();
  await loadOptions();
  showStatus("Configuration Reset");
}

async function clearEmptyOptions() {
  const items = await browser.storage.sync.get(null);
  const deleteKeys = Object.keys(items).filter((key) => {
    return items[key] === "";
  });
  await browser.storage.sync.remove(deleteKeys);
}

// Saves options to localStorage.
async function save_options() {
  const f = Object.entries(form.value).reduce((acc, [key, value]) => {
    if (value !== "") {
      acc[key] = value;
    }
    return acc;
  }, {});

  await browser.storage.sync.set({
    colorCode: colorCodes[color.value],
    ...f,
  });

  await clearEmptyOptions();

  console.log(await browser.storage.sync.get(null));

  // Update status to let user know options were saved.
  showStatus("Configuration Saved");
}

// Restores select box state to saved value from localStorage.
async function loadOptions() {
  const items = await browser.storage.sync.get(null);
  const { colorCode, width, rocker, trail, debug, ...gests } = items;

  color.value = colorNames[colorCode || ""] || "red";

  let f = gests;
  if (Object.keys(gests).length == 0) {
    f = invertHash(defaultGests);
  }
  form.value = {
    ...f,
    width: width || "3",
    rocker: rocker === undefined ? true : rocker,
    trail: trail === undefined ? true : trail,
    debug: debug === undefined ? false : debug,
  };
}

onBeforeMount(async () => {
  await loadOptions();
});
</script>

<style>
* {
  font-family: Sarala, Arial, sans-serif;
}

.row {
  display: flex;
  flex-wrap: wrap;
}

.row div {
  margin-right: 10px;
}

.onoffswitch {
  position: relative;
  width: 90px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
.onoffswitch-checkbox {
  display: none !important;
}
.onoffswitch-label {
  display: block;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid #999999;
  border-radius: 20px;
}
.onoffswitch-inner {
  display: block;
  width: 200%;
  margin-left: -100%;
  transition: margin 0.3s ease-in 0s;
}
.onoffswitch-inner:before,
.onoffswitch-inner:after {
  display: block;
  float: left;
  width: 50%;
  height: 30px;
  padding: 0;
  line-height: 30px;
  font-size: 14px;
  color: white;
  font-family: Sarala, Arial, sans-serif;
  font-weight: bold;
  box-sizing: border-box;
}
.onoffswitch-inner:before {
  content: "ON";
  padding-left: 10px;
  background-color: #1eaedb;
  color: #ffffff;
}
.onoffswitch-inner:after {
  content: "OFF";
  padding-right: 10px;
  background-color: #eeeeee;
  color: #999999;
  text-align: right;
}
.onoffswitch-switch {
  display: block;
  width: 18px;
  margin: 6px;
  background: #ffffff;
  position: absolute;
  top: 0;
  bottom: 0;
  right: 56px;
  border: 2px solid #999999;
  border-radius: 20px;
  transition: all 0.3s ease-in 0s;
}
.onoffswitch-checkbox:checked + .onoffswitch-label .onoffswitch-inner {
  margin-left: 0;
}
.onoffswitch-checkbox:checked + .onoffswitch-label .onoffswitch-switch {
  right: 0px;
}
.container {
  max-width: 800px;
}
.optiontable {
  width: 100%;
}
.optiontable tr td input {
  width: 120px;
}
input[type="text"] {
  height: 27px;
}
table.optiontable td {
  padding: 7px 0px;
}
input,
textarea,
select,
fieldset {
  margin-bottom: 0 !important;
}
h1 {
  font-size: 32px;
  color: #1eaedb;
  margin-top: 25px;
  font-weight: 300;
  border-bottom: 1px dotted #999;
  letter-spacing: -1px;
  text-align: center;
}
.footer {
  font-size: 13px;
  line-height: 18px;
  text-align: center;
  font-weight: 300;
}
hr {
  margin-bottom: 10px;
  margin-top: 10px;
}
</style>
