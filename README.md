# RocketsMC
RocketsMC is a MEAN stack web app that acts as the home base for all data generated during launches. It's awesome and getting awesomer. Instructions below on how to set it up for yourself!

- - - -

# How To Run RocketsMC

## Installing MEAN Software
The computer hosting RocketsMC must have up to date Node.js and MongoDB. If you don't already have these packages installed on your laptop, follow the instructions below to install them.
<br>
### Installing Node.js
Install the latest "Mature and Dependable" version of Node.js (currently version 4.2.2). It can be downlaoded from [https://nodejs.org/en/download](https://nodejs.org/en/download). To verify you have Node.js and its package manager (npm), try running the commands:
<br><br>
`node -v`
<br><br>
and:
<br><br>
`npm -v`
<br><br>
which should run and print out the version numbers of your node and npm programs.
<br><br>
Oh also you need mongoose
<br><br>
`npm install mongoose`
<br><br>

### Installing MongoDB
Install the current stable release of MongoDB from the website [https://www.mongodb.org/downloads#production](https://www.mongodb.org/downloads#production). Unless you direct it otherwise, MongoDB will store the database in the directory /data/db (C:\data\db on Windows). Make sure this directory exists and is writable by you before starting the database.
<br><br>
To verify you have MongoDB installed and working try starting it with the command:
<br><br>
`mongod`
<br><br>
This should print a bunch of log messages including one saying "waiting for connections on port 27017". The mongod doesn't exit until the database is shut down so you will want to either run this in its own window or in background.
You should be able to directly interact with the MongoDB database by running the command:
<br><br>
`mongo`
<br><br>
Type `help` at the command prompt to see the available commands.
<br><br>

## Cloning this project

Find a nice clean directory to clone into and then:
<br><br>
`git clone https://github.com/stanford-ssi/RocketsMC.git`
<br><br>

### Required packages (this can take a while)
To be so awesome, RocketsMC relies on a ton of cool node packages & middleware modules and you will unfortunately have to download all of them. The full list is at the bottom of the release notes for 1.1 [here](https://docs.google.com/document/d/1N6SGKq-JJO89zIivK7wNK3RYYbvj7B7wqtDS7UPrz2E/edit?usp=sharing).
<br><br>
Luckily, the MEAN stack is actually pretty forgiving and running `npm install` in the top level of the directory (ie. where package.json lives) will tip off npm to all the required modules RocketsMC uses. 
<br><br>
However, if you find yourself missing something, you can always fetch the missing module use the command `npm install --save -g <module>` which will fetch the module name `<module>` into your node_modules directory and add the dependency to your package.json file. Use a require function to add the module to your web server. The dependencies and sub packages should sort themselves out. If you run into problems, there is usually a quick fix just a google search away! 

## Running the project

(make sure you already did a `npm install` at the top level of the project). Maybe give node a quick `npm update`.
<br><br>
You will need to start your MongoDB instance. Start MongoDB by running command:
<br><br>
`mongod`
<br><br>
Now open a new terminal window to execute <br><br>
`nodemon`
<br><br>
You should see RocketsMC come to life at [http://localhost:3000/](http://localhost:3000/)
