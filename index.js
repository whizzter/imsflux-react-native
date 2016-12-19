import imsflux from 'imsflux';

import React, { Component } from 'react';
import ReactNative, { AsyncStorage } from 'react-native';

let imsfluxrn={};

// proxy imsflux for simplified usage.
imsfluxrn.store=(...args)=>imsflux.store(...args);
imsfluxrn.dispatch=(...args)=>imsflux.dispatch(...args);

imsfluxrn.persistent=function(store) {
	let storeKey="imsflux:"+store;
	let regper=()=>{
		imsflux.store(store).listen((state)=>{
			AsyncStorage.setItem(storeKey,JSON.stringify(state))
			.then(()=>{
				console.log("stored to async storage:"+store);
			}).catch((e)=>{
				console.log("failed to store to "+store+" due to ",e);
			})
		});
	}
	AsyncStorage.getItem(storeKey)
	.then((v)=>{
		console.log("Got "+v+" for store "+store);
		if (v!==null) {
			let data=JSON.parse(v);
			imsflux.dispatch(store,"imsflux_restore",data);
		}
		regper();
	})
	.catch((err)=>{
		console.log("Error loading store "+store);
		regper();
	})
};

imsfluxrn.connect=function(stores,Cls) {
	let computeState=()=>{
		return stores.reduce( (iv,storename)=>{
			if ( storename in __imsflux_store_registry__) {
				iv[storename]=imsflux.store(storename).get(); //  __imsflux_store_registry__[storename].state;
			}
			return iv;
		},{})
	};
	return class Wrapper extends Component {
		constructor() {
			super();
			this.listeners=[];
			this.state=computeState();
		}

		componentWillMount() {
			//console.log("!! Will mount called");
			this.listeners=stores.map((storename)=>{
				//console.log("Listening to "+storename);
				let store=imsflux.store(storename);
				let cb=()=>{
					//console.log("I was alerted for "+storename);
					this.setState(computeState())
				}
				store.listen(cb);
				return [store,cb];
			});
		}
		componentWillUnmount() {
			for (let kv of this.listeners) {
				kv[0].unlisten(kv[1]);
			}
		}
		render() {
			//console.log("!! Render called");
			return <Cls { ... this.props } { ... this.state } />
		}
	};
};

export default imsfluxrn;
