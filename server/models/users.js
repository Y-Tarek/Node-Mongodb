const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');
// Creating  users (table or model)
//Schema used to allow operations on tables 
  var UserSchema = new mongoose.Schema({
      email:{
          type:String,
          required:true,
          trim:true,
          unique:true,
          validate:{
             validator: (value) => {
                   return validator.isEmail(value)
             },
              message: '{VALUE} is not a valid email'
          },
      },

      password : {
        type:String,
        required: true,
        minlength:5,
      },

      tokens: [{
        access: {
          type:String,
          required:true
        },
        token: {
          type: String,
          required:true
        }
      }]

    });

      UserSchema.methods.toJSON = function(){
        var user = this;
        var userObject = user.toObject();
          return _.pick(userObject,['tokens','email','_id']);
      };
// Instance Methods : They can edit or inserts or remove so we take an instance to perform any of these operations on models.

      UserSchema.methods.generateAuthToken = function(){
        var user = this;
        var access = 'auth';
        var token = jwt.sign({_id: user._id,access:access},process.env.JWT_SECRET);
          user.tokens.push({
            access,
            token
          });
          return user.save().then(() => {
          return token;
        });
      }


      UserSchema.methods.removeToken = function(token){
        var user=this;
        return user.update({
          $pull: {
            tokens:{
              token:token
            }
          }
        })
      }

// Model Methods : They can find data  so we donot need to  take an instance we just call the model.
      UserSchema.statics.findByToken = function(token){
       var user = this;
       var decoded;
         try{
          decoded = jwt.verify(token,process.env.JWT_SECRET);
          
          
         }catch(e){
           console.log(e);
            return Promise.reject();
            
         }
         return user.findOne({
           '_id' : decoded._id,
          'tokens.token' : token,
          'tokens.access' : 'auth'
         });
      };

      UserSchema.statics.findByCredintials = function(email,password){
         var user = this;
         return user.findOne({
           email
         }).then((user) => {
           if(!user){
             return Promise.reject();
           }
           return new Promise((resolve,reject)=>{
             bcrypt.compare(password,user.password,(err,res) => {
               if(res){
                 resolve(user);
               }else{
                 reject();
               }
             })
           })
         })
      }
// this a middleware so we called next function if we didnot the program would crash.
      UserSchema.pre('save',function(next){
        var user = this;
          if(user.isModified('password')){
            bcrypt.genSalt(10,(err,salt) => {
              bcrypt.hash(user.password,salt,(err,hash) => {
                user.password = hash;
                next();
              })
            })
          }else{
            next();
          }
      })
//  gensalt is like adding salt to to food so that no body will eat it it adds some features to password and generates salted password to be hashed,
//  10 stands for the cost factors to generate a diffrent hashed password every time the more cost the harder to get real password,
//  This protect from rainbow table attacks which is a database with many hashed passwords that can be compared and hack your hashed passwords,
//  so salt in becrypt stop that and even if two passwords the same the hash will hardly ever be the same.

    var users = mongoose.model('users',UserSchema);

     module.exports = {Users:users}