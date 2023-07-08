---
title: Creating AI Bot
sidebar_position: 6
---

# Creating AI Bot to Drive NPC Accounts

## Reading In-game Data

### Option 1. Get Real-time Log Using Firebase RTDB Admin SDK

:::warning

This approach will give you full **admin** access to Firebase Realtime Database from your development machine. However, do not attempt to directly write data into Realtime Database. It will bypass all the integrity-check code implemented at the API level, and almost certainly break your game logs! To perform in-game actions such as talking or voting, **always** use the API, as described below.

:::

### Option 2. Poll

## Performing In-game Actions
