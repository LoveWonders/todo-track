package com.todotrack.app;

import com.getcapacitor.BridgeActivity;
import com.todotrack.app.plugins.DownloadPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(DownloadPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        lockTextZoom();
    }

    @Override
    public void onResume() {
        super.onResume();
        lockTextZoom();
    }

    private void lockTextZoom() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
